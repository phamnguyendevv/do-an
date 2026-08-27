import dotenv from 'dotenv'
import { DataSource } from 'typeorm'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

import { Category } from '../src/infrastructure/databases/postgresql/entities/category.entity'
import { Supplier } from '../src/infrastructure/databases/postgresql/entities/supplier.entity'
import { Book } from '../src/infrastructure/databases/postgresql/entities/book.entity'
import { BookstoreOrder } from '../src/infrastructure/databases/postgresql/entities/bookstore-order.entity'
import { OrderHistory } from '../src/infrastructure/databases/postgresql/entities/order-history.entity'
import { StockMovement } from '../src/infrastructure/databases/postgresql/entities/stock-movement.entity'
import { StockAudit } from '../src/infrastructure/databases/postgresql/entities/stock-audit.entity'
import { ImportReceipt } from '../src/infrastructure/databases/postgresql/entities/import-receipt.entity'
import { ExportReceipt } from '../src/infrastructure/databases/postgresql/entities/export-receipt.entity'

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_NAME || 'myapp',
    schema: process.env.DATABASE_SCHEMA || 'public',
    entities: [
      Category,
      Supplier,
      Book,
      BookstoreOrder,
      OrderHistory,
      StockMovement,
      StockAudit,
      ImportReceipt,
      ExportReceipt,
    ],
    synchronize: true,
  })

  await dataSource.initialize()
  console.log('Connected to PostgreSQL successfully.')

  const queryRunner = dataSource.createQueryRunner()
  await queryRunner.connect()

  // 1. Xóa toàn bộ dữ liệu đơn hàng, lịch sử đơn, vận chuyển, sổ kho và kiểm kê
  console.log('Cleaning up orders, order histories, stock movements, audits, imports, exports, books, categories, suppliers...')
  await queryRunner.query('TRUNCATE TABLE bookstore_orders RESTART IDENTITY CASCADE')
  await queryRunner.query('TRUNCATE TABLE order_histories RESTART IDENTITY CASCADE')
  await queryRunner.query('TRUNCATE TABLE stock_movements RESTART IDENTITY CASCADE')
  await queryRunner.query('TRUNCATE TABLE stock_audits RESTART IDENTITY CASCADE')
  await queryRunner.query('TRUNCATE TABLE import_receipts RESTART IDENTITY CASCADE')
  await queryRunner.query('TRUNCATE TABLE export_receipts RESTART IDENTITY CASCADE')
  await queryRunner.query('TRUNCATE TABLE books RESTART IDENTITY CASCADE')
  await queryRunner.query('TRUNCATE TABLE categories RESTART IDENTITY CASCADE')
  await queryRunner.query('TRUNCATE TABLE suppliers RESTART IDENTITY CASCADE')

  // 2. Thêm 5 Danh mục
  console.log('Seeding 5 categories...')
  const categoryRepo = dataSource.getRepository(Category)
  const categoriesData = [
    { name: 'Văn học & Tiểu thuyết', description: 'Các tác phẩm văn học trong nước và kinh điển thế giới.' },
    { name: 'Kinh tế & Quản trị kinh doanh', description: 'Sách kinh doanh, khởi nghiệp, tài chính, đầu tư và marketing.' },
    { name: 'Kỹ năng sống & Phát triển bản thân', description: 'Sách tư duy tích cực, kỹ năng giao tiếp và định hình phong cách sống.' },
    { name: 'Công nghệ thông tin & Lập trình', description: 'Giáo trình, tài liệu chuyên sâu về kiến trúc phần mềm, lập trình và AI.' },
    { name: 'Khoa học & Tâm lý học', description: 'Khám phá thế giới tự nhiên, tâm lý con người và hành vi xã hội.' },
  ]
  const savedCategories = await categoryRepo.save(categoriesData)
  console.log(`Saved ${savedCategories.length} categories.`)

  // 3. Thêm 5 Nhà cung cấp
  console.log('Seeding 5 suppliers...')
  const supplierRepo = dataSource.getRepository(Supplier)
  const suppliersData = [
    {
      name: 'NXB Trẻ',
      contactName: 'Nguyễn Văn Minh (Phụ trách phát hành)',
      phone: '02839316289',
      email: 'hopthu@nxbtre.com.vn',
      address: '161B Lý Chính Thắng, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
      note: 'Đối tác xuất bản sách văn học, công nghệ và thiếu nhi',
    },
    {
      name: 'NXB Kim Đồng',
      contactName: 'Trần Thị Thu Hà',
      phone: '02839390451',
      email: 'cskh_online@nxbkimdong.com.vn',
      address: '248 Cống Quỳnh, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh',
      note: 'Nhà xuất bản truyện tranh và sách thiếu nhi hàng đầu',
    },
    {
      name: 'Nhã Nam',
      contactName: 'Lê Hoàng Nam (Phòng kinh doanh)',
      phone: '02435146875',
      email: 'kinhdoanh@nhanam.vn',
      address: '59 Đỗ Quang, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội',
      note: 'Đơn vị phát hành sách văn học dịch và tiểu thuyết kinh điển',
    },
    {
      name: 'Alpha Books',
      contactName: 'Phạm Thanh Bình',
      phone: '0932329986',
      email: 'contact@alphabooks.vn',
      address: 'Tầng 3, Dream Center Home, 11A Ba Đình, Hà Nội',
      note: 'Chuyên xuất bản sách kinh tế, quản trị và tư duy',
    },
    {
      name: 'NXB Tổng Hợp TP.HCM',
      contactName: 'Võ Thị Mai Phương',
      phone: '02838225340',
      email: 'tonghop@nxbhcm.com.vn',
      address: '62 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
      note: 'Sách nghiên cứu, khoa học xã hội và kỹ năng sống',
    },
  ]
  const savedSuppliers = await supplierRepo.save(suppliersData)
  console.log(`Saved ${savedSuppliers.length} suppliers.`)

  // 4. Thêm 10 Đầu sách chuẩn
  console.log('Seeding 10 books...')
  const bookRepo = dataSource.getRepository(Book)
  const booksData = [
    {
      title: 'Đắc Nhân Tâm',
      author: 'Dale Carnegie',
      publisher: 'NXB Tổng Hợp TP.HCM',
      isbn: '978-604-58-1234-5',
      category: 'Kỹ năng sống & Phát triển bản thân',
      purchasePrice: 65000,
      sellingPrice: 95000,
      stock: 120,
      minStock: 15,
      status: 'IN_STOCK',
    },
    {
      title: 'Nhà Giả Kim',
      author: 'Paulo Coelho',
      publisher: 'Nhã Nam',
      isbn: '978-604-98-5678-9',
      category: 'Văn học & Tiểu thuyết',
      purchasePrice: 55000,
      sellingPrice: 85000,
      stock: 80,
      minStock: 10,
      status: 'IN_STOCK',
    },
    {
      title: 'Tư Duy Nhanh Và Chậm',
      author: 'Daniel Kahneman',
      publisher: 'Alpha Books',
      isbn: '978-604-77-9012-3',
      category: 'Khoa học & Tâm lý học',
      purchasePrice: 140000,
      sellingPrice: 209000,
      stock: 45,
      minStock: 8,
      status: 'IN_STOCK',
    },
    {
      title: 'Clean Code - Mã Sạch',
      author: 'Robert C. Martin',
      publisher: 'NXB Trẻ',
      isbn: '978-604-1-18923-4',
      category: 'Công nghệ thông tin & Lập trình',
      purchasePrice: 210000,
      sellingPrice: 315000,
      stock: 35,
      minStock: 5,
      status: 'IN_STOCK',
    },
    {
      title: 'Bắt Trẻ Đồng Xanh',
      author: 'J.D. Salinger',
      publisher: 'Nhã Nam',
      isbn: '978-604-98-1122-1',
      category: 'Văn học & Tiểu thuyết',
      purchasePrice: 58000,
      sellingPrice: 90000,
      stock: 60,
      minStock: 10,
      status: 'IN_STOCK',
    },
    {
      title: 'Khởi Nghiệp Tinh Gọn (The Lean Startup)',
      author: 'Eric Ries',
      publisher: 'Alpha Books',
      isbn: '978-604-77-3344-5',
      category: 'Kinh tế & Quản trị kinh doanh',
      purchasePrice: 110000,
      sellingPrice: 168000,
      stock: 50,
      minStock: 10,
      status: 'IN_STOCK',
    },
    {
      title: 'Doraemon Tuyển Tập Tranh Truyện Màu (Tập 1)',
      author: 'Fujiko F. Fujio',
      publisher: 'NXB Kim Đồng',
      isbn: '978-604-2-00112-9',
      category: 'Văn học & Tiểu thuyết',
      purchasePrice: 35000,
      sellingPrice: 55000,
      stock: 150,
      minStock: 20,
      status: 'IN_STOCK',
    },
    {
      title: 'Thiết Kế Hệ Thống Quy Mô Lớn (System Design)',
      author: 'Alex Xu',
      publisher: 'NXB Trẻ',
      isbn: '978-604-1-24556-7',
      category: 'Công nghệ thông tin & Lập trình',
      purchasePrice: 250000,
      sellingPrice: 368000,
      stock: 25,
      minStock: 5,
      status: 'IN_STOCK',
    },
    {
      title: 'Tâm Lý Học Tội Phạm',
      author: 'Diệp Hồng Vũ',
      publisher: 'NXB Tổng Hợp TP.HCM',
      isbn: '978-604-58-7788-9',
      category: 'Khoa học & Tâm lý học',
      purchasePrice: 95000,
      sellingPrice: 145000,
      stock: 40,
      minStock: 8,
      status: 'IN_STOCK',
    },
    {
      title: 'Chiến Lược Đại Dương Xanh',
      author: 'W. Chan Kim & Renée Mauborgne',
      publisher: 'Alpha Books',
      isbn: '978-604-77-5566-0',
      category: 'Kinh tế & Quản trị kinh doanh',
      purchasePrice: 135000,
      sellingPrice: 199000,
      stock: 55,
      minStock: 10,
      status: 'IN_STOCK',
    },
  ]
  const savedBooks = await bookRepo.save(booksData)
  console.log(`Saved ${savedBooks.length} books.`)

  console.log('✅ SEED & RESET COMPLETED SUCCESSFULLY!')
  await dataSource.destroy()
  process.exit(0)
}

run().catch((err) => {
  console.error('Error during reset and seed:', err)
  process.exit(1)
})
