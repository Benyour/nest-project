# 消息队列（MQ）详解 - 家庭物品管家项目

> **2025-11-11 更新：项目已实装 CloudAMQP（RabbitMQ）提醒管道**
>
> - 通过 `NotificationsModule` 接入 CloudAMQP，`NotificationScannerService` 定时扫描低库存/临期数据并向队列发布 `notifications.stock` 事件。
> - `NotificationConsumerService` 作为微服务消费者，监听队列并调用 `EmailService` 发送提醒邮件（使用 `nodemailer`）。
> - 自动生成购物清单：低库存/临期事件额外发布 `shopping-lists.auto-create`，由 `ShoppingListConsumerService` 聚合物品到待购清单。
> - 相关环境变量：`RABBITMQ_URL`、`RABBITMQ_NOTIFICATION_QUEUE`、`RABBITMQ_SHOPPING_LIST_QUEUE`、`NOTIFICATION_*`、`MAIL_*`（样例见 `config/local.env.example`）。
> - 如果未配置 SMTP 凭据，消费逻辑会记录日志但不会真正发送邮件，便于本地调试。

## 1. 什么是消息队列？

### 1.1 生活中的类比

想象一下**邮局**的工作方式：

```
你寄信 → 邮局（暂存） → 邮递员（慢慢送） → 收信人
```

**消息队列**就像邮局：
- **生产者**：你（寄信的人）
- **消息队列**：邮局（暂存信件的地方）
- **消费者**：邮递员（处理信件的人）

### 1.2 技术上的理解

**消息队列**是一个**中间件**，用于：
- **解耦**：发送方和接收方不需要直接联系
- **异步处理**：发送方不需要等待接收方处理完
- **削峰填谷**：处理突发的大量请求
- **可靠性**：消息不会丢失，可以重试

---

## 2. 为什么需要消息队列？

### 2.1 没有MQ的问题

假设用户购买了一堆物品，系统需要：
1. ✅ 更新数据库（保存购买记录）
2. ✅ 更新物品数量
3. ✅ 发送过期提醒（如果有快过期的）
4. ✅ 发送低库存提醒（如果快用完了）
5. ✅ 更新统计数据
6. ✅ 发送通知给家庭成员

**同步处理**（没有MQ）：
```
用户点击"确认购买"
  ↓
等待：保存数据库（100ms）
  ↓
等待：更新数量（50ms）
  ↓
等待：检查过期（200ms）← 很慢！
  ↓
等待：发送通知（500ms）← 很慢！
  ↓
等待：更新统计（300ms）
  ↓
总共：1150ms ← 用户要等1秒多！
```

**问题**：
- ❌ 用户等待时间长
- ❌ 如果某个步骤失败，整个流程失败
- ❌ 服务器压力大

### 2.2 有MQ的好处

**异步处理**（有MQ）：
```
用户点击"确认购买"
  ↓
快速：保存数据库（100ms）
  ↓
快速：更新数量（50ms）
  ↓
立即返回给用户（150ms）← 很快！
  ↓
后台异步处理：
  - 检查过期（慢慢来）
  - 发送通知（慢慢来）
  - 更新统计（慢慢来）
```

**好处**：
- ✅ 用户响应快（150ms vs 1150ms）
- ✅ 后台慢慢处理，不影响用户体验
- ✅ 如果某个步骤失败，可以重试
- ✅ 服务器压力分散

---

## 3. 在这个项目中的具体应用场景

### 场景1：过期提醒检查 ⭐⭐⭐ 最重要

**业务需求**：
- 每天检查一次，哪些物品快过期了
- 如果7天内过期，发送提醒

**没有MQ的问题**：
```typescript
// 用户访问首页时
@Get('dashboard')
async getDashboard() {
  // 同步检查所有物品的过期情况
  const expiringItems = await this.checkAllItems(); // 很慢！可能要几秒
  return { expiringItems };
}
```
- ❌ 用户每次打开首页都要等很久
- ❌ 如果有很多物品，检查很慢

**使用MQ的解决方案**：
```typescript
// 定时任务：每天凌晨2点检查（用户睡觉时）
@Cron('0 0 2 * * *') // 每天凌晨2点
async checkExpiryItems() {
  // 1. 找到所有需要检查的物品
  const items = await this.stockService.findAll();
  
  // 2. 发送到消息队列（不等待处理）
  for (const item of items) {
    await this.messageQueue.publish('check.expiry', {
      itemId: item.id,
      expiryDate: item.expiryDate,
    });
  }
  
  // 立即返回，不等待处理
}

// 消费者：后台慢慢处理
@RabbitSubscribe({
  exchange: 'notifications',
  routingKey: 'check.expiry',
})
async handleExpiryCheck(data: { itemId: string, expiryDate: Date }) {
  // 检查是否快过期
  const daysUntilExpiry = this.calculateDays(data.expiryDate);
  
  if (daysUntilExpiry <= 7) {
    // 发送提醒（这个操作可能很慢，但不影响主流程）
    await this.notificationService.sendExpiryAlert(data.itemId);
  }
}
```

**好处**：
- ✅ 用户访问首页时不需要等待
- ✅ 检查在后台慢慢进行
- ✅ 可以并发处理多个物品

---

### 场景2：低库存提醒 ⭐⭐

**业务需求**：
- 每小时检查一次，哪些物品快用完了
- 如果数量低于阈值，发送提醒

**使用MQ**：
```typescript
// 定时任务：每小时检查
@Cron('0 * * * * *') // 每小时
async checkLowStock() {
  const lowStockItems = await this.stockService.findLowStock();
  
  // 发送到消息队列
  for (const item of lowStockItems) {
    await this.messageQueue.publish('low.stock.alert', {
      itemId: item.id,
      currentQuantity: item.quantity,
      minQuantity: item.minQuantity,
    });
  }
}

// 消费者：处理低库存提醒
@RabbitSubscribe({
  exchange: 'notifications',
  routingKey: 'low.stock.alert',
})
async handleLowStockAlert(data: any) {
  // 发送通知（可能很慢，但不影响主流程）
  await this.notificationService.sendLowStockAlert(data);
  
  // 可以发送邮件、短信、微信等（这些操作都很慢）
}
```

---

### 场景3：数据统计任务 ⭐⭐

**业务需求**：
- 每天凌晨计算统计数据（消费趋势、使用频率等）
- 这个计算可能很耗时

**使用MQ**：
```typescript
// 定时任务：每天凌晨3点
@Cron('0 0 3 * * *')
async generateStatistics() {
  // 发送统计任务到队列
  await this.messageQueue.publish('statistics.generate', {
    date: new Date(),
    userId: 'all',
  });
}

// 消费者：慢慢计算统计
@RabbitSubscribe({
  exchange: 'tasks',
  routingKey: 'statistics.generate',
})
async handleStatisticsGeneration(data: any) {
  // 这个计算可能很慢（几分钟），但不影响用户使用
  const stats = await this.statisticsService.calculate({
    // 计算消费趋势
    // 计算使用频率
    // 计算库存周转率
    // ... 很多计算
  });
  
  // 保存结果
  await this.statisticsService.save(stats);
}
```

---

### 场景4：购买记录确认后的后续处理 ⭐⭐⭐

**业务需求**：
用户确认购买记录后，需要：
1. ✅ 更新物品数量（必须立即完成）
2. ✅ 检查是否有快过期的物品（可以慢慢来）
3. ✅ 更新统计数据（可以慢慢来）
4. ✅ 发送通知给家庭成员（可以慢慢来）

**使用MQ**：
```typescript
@Post('purchase-records/:id/confirm')
async confirmPurchaseRecord(@Param('id') id: string) {
  // 1. 立即更新数据库（必须同步）
  await this.dataSource.transaction(async (manager) => {
    // 更新记录状态
    await manager.update(PurchaseRecord, id, { status: 'confirmed' });
    
    // 更新物品数量
    const record = await manager.findOne(PurchaseRecord, { where: { id } });
    for (const item of record.items) {
      await manager.increment(Stock, 
        { itemId: item.itemId }, 
        'quantity', 
        item.quantity
      );
    }
  });
  
  // 2. 发送后续任务到消息队列（异步处理）
  await this.messageQueue.publish('purchase.confirmed', {
    recordId: id,
    items: record.items,
  });
  
  // 3. 立即返回给用户（很快！）
  return { success: true, message: '购买记录已确认' };
}

// 消费者：处理后续任务
@RabbitSubscribe({
  exchange: 'events',
  routingKey: 'purchase.confirmed',
})
async handlePurchaseConfirmed(data: any) {
  // 这些操作可以慢慢来，不影响用户体验
  
  // 检查是否有快过期的物品
  await this.checkExpiryItems(data.items);
  
  // 更新统计数据
  await this.statisticsService.updatePurchaseStats(data.recordId);
  
  // 发送通知
  await this.notificationService.notifyFamilyMembers({
    type: 'purchase',
    recordId: data.recordId,
  });
}
```

---

### 场景5：批量导入Excel文件 ⭐

**业务需求**：
用户上传Excel文件，导入大量物品数据

**使用MQ**：
```typescript
@Post('items/import')
async importItems(@UploadedFile() file: Express.Multer.File) {
  // 1. 立即返回（告诉用户文件已接收）
  const taskId = uuidv4();
  
  // 2. 发送导入任务到队列
  await this.messageQueue.publish('items.import', {
    taskId,
    fileUrl: await this.uploadFile(file),
  });
  
  return { 
    success: true, 
    taskId,
    message: '文件已接收，正在处理中...' 
  };
}

// 消费者：慢慢处理导入
@RabbitSubscribe({
  exchange: 'tasks',
  routingKey: 'items.import',
})
async handleItemsImport(data: { taskId: string, fileUrl: string }) {
  // 这个处理可能很慢（如果有1000条数据）
  const items = await this.excelService.parse(data.fileUrl);
  
  for (const item of items) {
    await this.itemsService.create(item);
  }
  
  // 处理完成后，通知用户
  await this.notificationService.sendImportComplete(data.taskId);
}
```

---

## 4. MQ的工作流程（图解）

### 4.1 过期提醒检查流程

```
┌─────────────────┐
│  定时任务       │
│  (每天凌晨2点)  │
└────────┬────────┘
         │
         │ 1. 发送消息
         ↓
┌─────────────────┐
│   消息队列      │
│   (RabbitMQ)    │
│                 │
│  [消息1]        │
│  [消息2]        │
│  [消息3]        │
│  ...            │
└────────┬────────┘
         │
         │ 2. 消费者慢慢处理
         ↓
┌─────────────────┐
│   消费者        │
│  (后台服务)     │
│                 │
│  - 检查过期     │
│  - 发送提醒     │
│  - 更新数据库   │
└─────────────────┘
```

### 4.2 购买记录确认流程

```
用户点击"确认购买"
         │
         ↓
┌─────────────────┐
│  立即处理       │
│  (必须同步)     │
│                 │
│  ✓ 更新状态     │
│  ✓ 更新数量     │
└────────┬────────┘
         │
         │ 立即返回给用户（很快！）
         ↓
   用户看到"成功"
         │
         │ 同时发送消息到队列
         ↓
┌─────────────────┐
│   消息队列      │
└────────┬────────┘
         │
         │ 后台慢慢处理
         ↓
┌─────────────────┐
│   异步处理      │
│  (不着急)       │
│                 │
│  - 检查过期     │
│  - 更新统计     │
│  - 发送通知     │
└─────────────────┘
```

---

## 5. 技术实现（RabbitMQ）

### 5.1 安装和配置

```bash
# 安装依赖
npm install @nestjs/microservices amqplib amqp-connection-manager
```

```typescript
// app.module.ts
import { RabbitMQModule } from '@nestjs/microservices';

@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      exchanges: [
        { name: 'notifications', type: 'topic' },
        { name: 'tasks', type: 'topic' },
        { name: 'events', type: 'topic' },
      ],
    }),
  ],
})
export class AppModule {}
```

### 5.2 发送消息（生产者）

```typescript
@Injectable()
export class MessageProducer {
  constructor(
    @Inject('RABBITMQ_CONNECTION') 
    private readonly connection: Connection,
  ) {}
  
  async publish(exchange: string, routingKey: string, data: any) {
    const channel = await this.connection.createChannel();
    await channel.assertExchange(exchange, 'topic', { durable: true });
    
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)), {
      persistent: true, // 消息持久化，服务器重启不丢失
    });
    
    await channel.close();
  }
}
```

### 5.3 接收消息（消费者）

```typescript
@Injectable()
export class NotificationConsumer {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly stockService: StockService,
  ) {}
  
  @RabbitSubscribe({
    exchange: 'notifications',
    routingKey: 'check.expiry',
    queue: 'expiry-check-queue',
  })
  async handleExpiryCheck(data: { itemId: string, expiryDate: Date }) {
    try {
      // 处理消息
      const daysUntilExpiry = this.calculateDays(data.expiryDate);
      
      if (daysUntilExpiry <= 7) {
        await this.notificationService.sendExpiryAlert(data.itemId);
      }
    } catch (error) {
      // 如果处理失败，消息会重新入队（可以重试）
      console.error('处理过期检查失败:', error);
      throw error; // 抛出错误，让MQ重新投递
    }
  }
}
```

---

## 6. 为什么选择RabbitMQ？

### 6.1 优势

1. **可靠性**：
   - 消息持久化（服务器重启不丢失）
   - 消息确认机制（处理完才删除）
   - 支持消息重试

2. **灵活性**：
   - 支持多种消息模式（点对点、发布订阅）
   - 支持路由规则
   - 支持优先级队列

3. **易用性**：
   - 有Web管理界面
   - 文档完善
   - NestJS官方支持

### 6.2 其他MQ对比

| MQ | 特点 | 适用场景 |
|---|------|---------|
| **RabbitMQ** | 功能全面、可靠性高 | ✅ 本项目（推荐） |
| **Redis** | 简单、性能好 | 简单场景 |
| **Kafka** | 高吞吐量、适合大数据 | 大数据场景 |
| **RocketMQ** | 阿里开源、适合电商 | 电商场景 |

---

## 7. 实际代码示例

### 7.1 完整的过期提醒实现

```typescript
// 1. 定时任务：发送检查任务
@Injectable()
export class ScheduledTasks {
  constructor(
    private readonly messageProducer: MessageProducer,
    private readonly stockService: StockService,
  ) {}
  
  @Cron('0 0 2 * * *') // 每天凌晨2点
  async checkExpiryItems() {
    console.log('开始检查过期物品...');
    
    // 找到所有有保质期的物品
    const items = await this.stockService.findItemsWithExpiry();
    
    // 发送到消息队列
    for (const item of items) {
      await this.messageProducer.publish('notifications', 'check.expiry', {
        itemId: item.id,
        itemName: item.name,
        expiryDate: item.expiryDate,
        userId: item.userId,
      });
    }
    
    console.log(`已发送 ${items.length} 个检查任务到队列`);
  }
}

// 2. 消费者：处理检查任务
@Injectable()
export class ExpiryCheckConsumer {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}
  
  @RabbitSubscribe({
    exchange: 'notifications',
    routingKey: 'check.expiry',
    queue: 'expiry-check-queue',
  })
  async handleExpiryCheck(data: {
    itemId: string;
    itemName: string;
    expiryDate: Date;
    userId: string;
  }) {
    const daysUntilExpiry = this.calculateDaysUntilExpiry(data.expiryDate);
    
    if (daysUntilExpiry <= 0) {
      // 已过期
      await this.notificationService.send({
        userId: data.userId,
        type: 'expired',
        title: '物品已过期',
        message: `${data.itemName} 已过期，请及时处理`,
      });
    } else if (daysUntilExpiry <= 3) {
      // 3天内过期
      await this.notificationService.send({
        userId: data.userId,
        type: 'expiring_soon',
        title: '物品即将过期',
        message: `${data.itemName} 将在 ${daysUntilExpiry} 天后过期`,
      });
    } else if (daysUntilExpiry <= 7) {
      // 7天内过期
      await this.notificationService.send({
        userId: data.userId,
        type: 'expiring',
        title: '物品快过期了',
        message: `${data.itemName} 将在 ${daysUntilExpiry} 天后过期`,
      });
    }
  }
  
  private calculateDaysUntilExpiry(expiryDate: Date): number {
    const today = new Date();
    const diff = expiryDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
```

---

## 8. 总结

### 8.1 MQ的核心价值

1. **解耦**：发送方和接收方不需要直接联系
2. **异步**：不需要等待，立即返回
3. **可靠**：消息不会丢失，可以重试
4. **削峰**：处理突发的大量请求

### 8.2 在这个项目中的应用

| 场景 | 为什么需要MQ | 好处 |
|------|------------|------|
| **过期提醒检查** | 检查很慢，用户不需要等待 | ✅ 用户响应快<br>✅ 后台慢慢处理 |
| **低库存提醒** | 每小时检查，不影响用户 | ✅ 定时任务<br>✅ 异步处理 |
| **数据统计** | 计算很慢，可以慢慢来 | ✅ 不阻塞用户<br>✅ 可以重试 |
| **购买确认后续** | 后续处理不紧急 | ✅ 立即返回<br>✅ 后台处理 |
| **Excel导入** | 导入大量数据很慢 | ✅ 立即响应<br>✅ 后台处理 |

### 8.3 简单理解

**MQ = 邮局**
- 你把信（消息）交给邮局（MQ）
- 邮局帮你慢慢送（消费者处理）
- 你不需要等（立即返回）

**没有MQ = 亲自送信**
- 你必须等对方收到才能走（同步等待）
- 如果对方不在，你要等很久（阻塞）

希望这个解释能帮助你理解MQ的作用！

