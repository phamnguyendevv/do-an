/**
 * Available actions that can be performed on resources
 */
export type TAction =
  | 'manage'
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'search'

/**
 * Available subjects (resources) in the system
 */
export type TSubject =
  | 'all'
  | 'Task'
  | 'User'
  | 'Book'
  | 'BookstoreOrder'
  | 'Category'
  | 'Supplier'
  | 'ImportReceipt'
  | 'ExportReceipt'
  | 'StockMovement'
  | 'Revenue'
  | 'Notification'
  | 'Service'
  | 'Appointment'
  | 'Promotion'
  | 'Review'
  | 'Payment'
  | 'Invoice'
  | 'Shipping'
  | 'Customer'
  | 'ActivityLog'
