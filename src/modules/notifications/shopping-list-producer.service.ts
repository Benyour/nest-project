import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface ShoppingListEvent {
  itemId: string;
  itemName: string;
  quantity: number;
  locationName: string | null;
  reason: 'low_stock' | 'near_expiry';
  detectedAt: string;
}

@Injectable()
export class ShoppingListProducerService {
  private readonly logger = new Logger(ShoppingListProducerService.name);

  constructor(
    @Inject('SHOPPING_LIST_QUEUE')
    private readonly shoppingListClient: ClientProxy,
  ) {}

  publish(event: ShoppingListEvent): void {
    this.shoppingListClient.emit<ShoppingListEvent>(
      'shopping-lists.auto-create',
      event,
    );
    this.logger.debug(
      `Published shopping list event for item ${event.itemId}: ${event.reason}`,
    );
  }
}
