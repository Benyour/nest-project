import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';

const DEFAULT_TAX_RATE = 13;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createDto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(PurchaseOrder);
      const itemRepo = manager.getRepository(PurchaseOrderItem);

      const { items, taxRate, ...rest } = createDto;
      const orderTaxRate =
        typeof taxRate === 'number' ? taxRate : DEFAULT_TAX_RATE;

      const order = orderRepo.create({
        ...rest,
        taxRate: orderTaxRate,
      });

      const preparedItems = this.prepareItems(items, orderTaxRate);

      const subtotalAmount = preparedItems.reduce(
        (sum, item) => sum + item.amountExclTax,
        0,
      );
      const taxAmount = preparedItems.reduce(
        (sum, item) => sum + item.taxAmount,
        0,
      );
      const totalAmount = preparedItems.reduce(
        (sum, item) => sum + item.amountInclTax,
        0,
      );

      order.subtotalAmount = this.round(subtotalAmount, 2);
      order.taxAmount = this.round(taxAmount, 2);
      order.totalAmount = this.round(totalAmount, 2);

      const savedOrder = await orderRepo.save(order);

      const itemsWithOrder = preparedItems.map((item) =>
        itemRepo.create({
          ...item,
          purchaseOrderId: savedOrder.id,
        }),
      );

      await itemRepo.save(itemsWithOrder);

      return orderRepo.findOneOrFail({
        where: { id: savedOrder.id },
        relations: { items: true },
        order: { items: { lineNo: 'ASC' } },
      });
    });
  }

  async findAll(): Promise<PurchaseOrder[]> {
    return this.purchaseOrderRepository.find({
      relations: { items: true },
      order: { createdAt: 'DESC', items: { lineNo: 'ASC' } },
    });
  }

  async findOne(id: string): Promise<PurchaseOrder> {
    const order = await this.purchaseOrderRepository.findOne({
      where: { id },
      relations: { items: true },
      order: { items: { lineNo: 'ASC' } },
    });
    if (!order) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }
    return order;
  }

  async update(
    id: string,
    updateDto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(PurchaseOrder);
      const itemRepo = manager.getRepository(PurchaseOrderItem);

      const existing = await orderRepo.findOne({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Purchase order ${id} not found`);
      }

      const { items, taxRate, ...rest } = updateDto;
      const updatedOrder = orderRepo.merge(existing, {
        ...rest,
      });

      if (typeof taxRate === 'number') {
        updatedOrder.taxRate = taxRate;
      }

      if (items && items.length > 0) {
        const preparedItems = this.prepareItems(
          items,
          typeof updatedOrder.taxRate === 'number'
            ? updatedOrder.taxRate
            : DEFAULT_TAX_RATE,
        );

        await itemRepo.delete({ purchaseOrderId: id });

        const subtotalAmount = preparedItems.reduce(
          (sum, item) => sum + item.amountExclTax,
          0,
        );
        const taxAmount = preparedItems.reduce(
          (sum, item) => sum + item.taxAmount,
          0,
        );
        const totalAmount = preparedItems.reduce(
          (sum, item) => sum + item.amountInclTax,
          0,
        );

        updatedOrder.subtotalAmount = this.round(subtotalAmount, 2);
        updatedOrder.taxAmount = this.round(taxAmount, 2);
        updatedOrder.totalAmount = this.round(totalAmount, 2);

        const itemsWithOrder = preparedItems.map((item) =>
          itemRepo.create({
            ...item,
            purchaseOrderId: id,
          }),
        );

        await itemRepo.save(itemsWithOrder);
      }

      await orderRepo.save(updatedOrder);

      return orderRepo.findOneOrFail({
        where: { id },
        relations: { items: true },
        order: { items: { lineNo: 'ASC' } },
      });
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.purchaseOrderRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }
  }

  private prepareItems(
    items: CreatePurchaseOrderItemDto[],
    defaultTaxRate: number,
  ): Array<
    Omit<
      PurchaseOrderItem,
      'id' | 'purchaseOrder' | 'purchaseOrderId' | 'createdAt' | 'updatedAt'
    >
  > {
    return items.map((item, index) => {
      const taxRate = item.taxRate ?? defaultTaxRate ?? 0;
      const quantity = item.quantity;
      const unitPrice = item.unitPrice;

      const amountExclTax =
        item.amountExclTax ?? this.round(quantity * unitPrice, 2);
      const taxAmount =
        item.taxAmount ?? this.round((amountExclTax * taxRate) / 100, 2);
      const amountInclTax =
        item.amountInclTax ?? this.round(amountExclTax + taxAmount, 2);

      return {
        lineNo: item.lineNo ?? index + 1,
        skuCode: item.skuCode,
        skuName: item.skuName,
        specification: item.specification ?? null,
        uom: item.uom ?? null,
        quantity,
        unitPrice,
        taxRate,
        amountExclTax,
        taxAmount,
        amountInclTax,
        deliveryDate: item.deliveryDate ?? null,
        remarks: item.remarks ?? null,
      };
    });
  }

  private round(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}
