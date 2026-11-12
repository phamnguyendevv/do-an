import { MigrationInterface, QueryRunner } from 'typeorm'

export class SeedBooksCategoriesSuppliers1752000000000
  implements MigrationInterface
{
  name = 'SeedBooksCategoriesSuppliers1752000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm 4 danh mục nếu chưa tồn tại
    if (await queryRunner.hasTable('categories')) {
      await queryRunner.query(`
        INSERT INTO "categories" ("name", "description", "is_deleted", "created_at", "updated_at")
        SELECT v.name, v.description, false, now(), now()
        FROM (VALUES
          ('Văn học & Tiểu thuyết', 'Các tác phẩm văn học trong nước và quốc tế, tiểu thuyết, truyện ngắn đặc sắc'),
          ('Kinh tế & Kinh doanh', 'Sách về quản trị kinh doanh, tài chính, đầu tư, khởi nghiệp và marketing'),
          ('Công nghệ thông tin', 'Sách lập trình, kiến trúc phần mềm, trí tuệ nhân tạo, an toàn thông tin'),
          ('Kỹ năng sống & Phát triển bản thân', 'Sách rèn luyện tư duy, kỹ năng giao tiếp, quản lý thời gian và phát triển bản thân')
        ) AS v(name, description)
        WHERE NOT EXISTS (
          SELECT 1 FROM "categories" c WHERE c.name = v.name AND c.is_deleted = false
        );
      `)
    }

    // 2. Thêm 7 nhà cung cấp nếu chưa tồn tại
    if (await queryRunner.hasTable('suppliers')) {
      await queryRunner.query(`
        INSERT INTO "suppliers" ("name", "contactName", "phone", "email", "address", "note", "is_deleted", "created_at", "updated_at")
        SELECT v.name, v.contact_name, v.phone, v.email, v.address, v.note, false, now(), now()
        FROM (VALUES
          ('Nhà Xuất Bản Trẻ', 'Nguyễn Văn Minh', '02839316289', 'hopthu@nxbtre.com.vn', '161B Lý Chính Thắng, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh', 'Đối tác xuất bản sách văn học, kinh tế và kỹ năng'),
          ('Nhà Xuất Bản Kim Đồng', 'Trần Thị Thu Hà', '02439434730', 'cskh_online@nxbkimdong.com.vn', '55 Quang Trung, Phường Nguyễn Du, Quận Hai Bà Trưng, Hà Nội', 'Nhà xuất bản sách thiếu nhi, truyện tranh và văn học tuổi trẻ'),
          ('Công Ty Cổ Phần Sách Nhã Nam', 'Lê Hoàng Long', '02435146875', 'contact@nhanam.vn', '59 Đỗ Quang, Trung Hòa, Cầu Giấy, Hà Nội', 'Đơn vị phát hành văn học kinh điển và phi hư cấu chất lượng cao'),
          ('First News - Trí Việt', 'Nguyễn Văn Phước', '02838227979', 'triviet@firstnews.com.vn', '11H Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'Chuyên dòng sách kỹ năng sống Đắc Nhân Tâm, Hạt Giống Tâm Hồn'),
          ('Công Ty Sách Alpha Books', 'Phạm Thị Mai', '0932329959', 'support@alphabooks.vn', 'Tầng 3, Dream Center Home, 11A ngõ 282 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội', 'Hàng đầu về sách kinh tế, quản trị và khởi nghiệp'),
          ('Nhà Xuất Bản Tổng Hợp TP.HCM', 'Đỗ Thanh Tùng', '02838225340', 'tonghop@nxbhcm.com.vn', '62 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh', 'Nhà xuất bản các công trình nghiên cứu, lịch sử, văn hóa'),
          ('Công Ty Sách Thái Hà (ThaiHaBooks)', 'Vũ Thị Phương', '02437930480', 'contact@thaihabooks.com', 'Lô B2-08, Vinhomes Gardenia, Đường Hàm Nghi, Cầu Diễn, Hà Nội', 'Dòng sách phật giáo, nuôi dạy con, văn hóa và kinh doanh')
        ) AS v(name, contact_name, phone, email, address, note)
        WHERE NOT EXISTS (
          SELECT 1 FROM "suppliers" s WHERE s.name = v.name AND s.is_deleted = false
        );
      `)
    }

    // 3. Thêm 14 quyển sách nếu chưa tồn tại
    if (await queryRunner.hasTable('books')) {
      await queryRunner.query(`
        INSERT INTO "books" (
          "title", "author", "publisher", "isbn", "category", "category_id",
          "purchasePrice", "sellingPrice", "stock", "minStock", "status",
          "created_at", "updated_at"
        )
        SELECT
          v.title, v.author, v.publisher, v.isbn, v.category, c.id,
          v.purchase_price, v.selling_price, v.stock, v.min_stock, 'IN_STOCK',
          now(), now()
        FROM (VALUES
          ('Dế Mèn Phiêu Lưu Ký', 'Tô Hoài', 'NXB Kim Đồng', '978-604-2-22534-1', 'Văn học & Tiểu thuyết', 28000.00, 45000.00, 80, 15),
          ('Mắt Biếc', 'Nguyễn Nhật Ánh', 'NXB Trẻ', '978-604-1-15584-0', 'Văn học & Tiểu thuyết', 65000.00, 110000.00, 65, 10),
          ('Số Đỏ', 'Vũ Trọng Phụng', 'NXB Văn Học', '978-604-9-67219-5', 'Văn học & Tiểu thuyết', 38000.00, 60000.00, 45, 10),
          ('Cánh Đồng Bất Tận', 'Nguyễn Ngọc Tư', 'NXB Trẻ', '978-604-1-08992-3', 'Văn học & Tiểu thuyết', 50000.00, 85000.00, 50, 10),
          ('Khởi Nghiệp Tinh Gọn', 'Eric Ries', 'Alpha Books', '978-604-3-35612-4', 'Kinh tế & Kinh doanh', 105000.00, 169000.00, 40, 10),
          ('Nhà Đầu Tư Thông Minh', 'Benjamin Graham', 'NXB Trẻ', '978-604-1-18239-6', 'Kinh tế & Kinh doanh', 125000.00, 195000.00, 35, 8),
          ('Dốc Hết Trái Tim (Starbucks)', 'Howard Schultz', 'First News', '978-604-5-89412-2', 'Kinh tế & Kinh doanh', 85000.00, 138000.00, 30, 5),
          ('Tư Duy Nhanh Và Chậm', 'Daniel Kahneman', 'Alpha Books', '978-604-7-73891-2', 'Kinh tế & Kinh doanh', 120000.00, 189000.00, 25, 5),
          ('Clean Code - Mã Sạch', 'Robert C. Martin', 'NXB Khoa Học Kỹ Thuật', '978-604-6-71280-9', 'Công nghệ thông tin', 130000.00, 199000.00, 30, 8),
          ('Lập Trình Web Cơ Bản Với JavaScript', 'Phạm Minh Tuấn', 'NXB Bách Khoa Hà Nội', '978-604-9-54321-1', 'Công nghệ thông tin', 55000.00, 89000.00, 60, 15),
          ('Git Và GitHub Cho Người Mới Bắt Đầu', 'Lê Hoàng Long', 'NXB Thông Tin & Truyền Thông', '978-604-8-03456-7', 'Công nghệ thông tin', 42000.00, 72000.00, 50, 10),
          ('Đắc Nhân Tâm', 'Dale Carnegie', 'First News', '978-604-5-89823-6', 'Kỹ năng sống & Phát triển bản thân', 52000.00, 86000.00, 120, 25),
          ('Tuần Làm Việc 4 Giờ', 'Timothy Ferriss', 'ThaiHaBooks', '978-604-9-87654-3', 'Kỹ năng sống & Phát triển bản thân', 95000.00, 155000.00, 40, 10),
          ('Quẳng Gánh Lo Đi Và Vui Sống', 'Dale Carnegie', 'First News', '978-604-5-89824-3', 'Kỹ năng sống & Phát triển bản thân', 48000.00, 78000.00, 90, 20)
        ) AS v(title, author, publisher, isbn, category, purchase_price, selling_price, stock, min_stock)
        LEFT JOIN "categories" c ON c.name = v.category AND c.is_deleted = false
        WHERE NOT EXISTS (
          SELECT 1 FROM "books" b WHERE b.title = v.title
        );
      `)
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Giữ nguyên dữ liệu, không xóa bỏ khi rollback
  }
}
