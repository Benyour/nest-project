import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { PurchaseOrdersModule } from '../src/purchase-orders/purchase-orders.module';
import { PurchaseOrder } from '../src/purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../src/purchase-orders/entities/purchase-order-item.entity';

interface PurchaseOrderItemResponse {
  id: string;
  skuCode: string;
  skuName: string;
  specification: string | null;
  uom: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amountExclTax: number;
  taxAmount: number;
  amountInclTax: number;
  deliveryDate: string | null;
  remarks: string | null;
  lineNo: number;
}

interface PurchaseOrderResponse {
  id: string;
  orderCode: string;
  supplierName: string;
  supplierContact: string | null;
  supplierPhone: string | null;
  orderDate: string;
  expectedArrivalDate: string | null;
  currency: string;
  taxRate: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  remarks: string | null;
  items: PurchaseOrderItemResponse[];
}

type SupertestTarget = Parameters<typeof request>[0];

describe('PurchaseOrdersModule (e2e)', () => {
  let app: INestApplication;
  let server: SupertestTarget;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [PurchaseOrder, PurchaseOrderItem],
          dropSchema: true,
          synchronize: true,
        }),
        PurchaseOrdersModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    server = app.getHttpServer() as SupertestTarget;
  });

  afterAll(async () => {
    await app.close();
  });

  const baseUrl = '/purchase-orders';
  let createdId: string;

  const createPayload = {
    orderCode: 'PO-2025-TEST-001',
    supplierName: '测试供应商',
    supplierContact: '张三',
    supplierPhone: '13800001111',
    orderDate: '2025-01-10',
    expectedArrivalDate: '2025-01-20',
    taxRate: 13,
    currency: 'CNY',
    status: 'draft',
    remarks: '自动化测试创建',
    items: [
      {
        skuCode: 'MAT-001',
        skuName: '高速螺丝',
        quantity: 100,
        unitPrice: 2.35,
        deliveryDate: '2025-01-18',
      },
      {
        skuCode: 'MAT-009',
        skuName: '工业润滑油',
        quantity: 20,
        unitPrice: 58.6,
      },
    ],
  };

  it('POST /purchase-orders -> 201', async () => {
    const response = await request(server)
      .post(baseUrl)
      .send(createPayload)
      .expect(201);

    const body = response.body as PurchaseOrderResponse;

    expect(body).toMatchObject({
      orderCode: createPayload.orderCode,
      supplierName: createPayload.supplierName,
    });
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining<Partial<PurchaseOrderItemResponse>>({
          skuCode: 'MAT-001',
          lineNo: 1,
        }),
        expect.objectContaining<Partial<PurchaseOrderItemResponse>>({
          skuCode: 'MAT-009',
          lineNo: 2,
        }),
      ]),
    );

    createdId = body.id;
    expect(createdId).toBeDefined();
  });

  it('GET /purchase-orders -> 200 & list contains created order', async () => {
    const response = await request(server).get(baseUrl).expect(200);

    const list = response.body as PurchaseOrderResponse[];

    expect(Array.isArray(list)).toBeTruthy();
    expect(list.length).toBeGreaterThanOrEqual(1);
    const found = list.find((item) => item.id === createdId);
    expect(found).toBeDefined();
    expect(found?.items).toHaveLength(2);
  });

  it('GET /purchase-orders/:id -> 200 & returns detail', async () => {
    const response = await request(server)
      .get(`${baseUrl}/${createdId}`)
      .expect(200);

    const body = response.body as PurchaseOrderResponse;

    expect(body).toMatchObject({
      id: createdId,
      orderCode: createPayload.orderCode,
    });
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining<Partial<PurchaseOrderItemResponse>>({
          skuCode: 'MAT-001',
        }),
      ]),
    );
  });

  it('PATCH /purchase-orders/:id -> 200 & updates status', async () => {
    const updatePayload = {
      status: 'confirmed',
      remarks: '自动化测试更新',
      items: [
        {
          skuCode: 'MAT-001',
          skuName: '高速螺丝',
          quantity: 120,
          unitPrice: 2.35,
        },
      ],
    };

    const response = await request(server)
      .patch(`${baseUrl}/${createdId}`)
      .send(updatePayload)
      .expect(200);

    const body = response.body as PurchaseOrderResponse;

    expect(body.status).toBe('confirmed');
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      skuCode: 'MAT-001',
      quantity: 120,
      lineNo: 1,
    });
  });

  it('DELETE /purchase-orders/:id -> 200 & removes order', async () => {
    await request(server).delete(`${baseUrl}/${createdId}`).expect(200);

    await request(server).get(`${baseUrl}/${createdId}`).expect(404);
  });
});
