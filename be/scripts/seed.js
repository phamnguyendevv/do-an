const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 5432,
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '123456',
  database: process.env.DATABASE_NAME || 'myapp',
});

async function seed() {
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  // 1. Seed Categories (5)
  console.log('\n--- Seeding Categories (5) ---');
  const categories = [
    { name: 'Văn học', description: 'Tiểu thuyết, truyện ngắn, tác phẩm văn học kinh điển và hiện đại' },
    { name: 'Kinh tế - Kinh doanh', description: 'Quản trị, tài chính, đầu tư, khởi nghiệp và kinh doanh' },
    { name: 'Kỹ năng sống', description: 'Phát triển bản thân, tư duy, tâm lý và phong cách sống' },
    { name: 'Công nghệ thông tin', description: 'Lập trình, kiến trúc phần mềm, AI, dữ liệu và công nghệ' },
    { name: 'Thiếu nhi', description: 'Truyện tranh, cổ tích, khoa học khám phá dành cho thiếu nhi' },
  ];

  for (const cat of categories) {
    const existing = await client.query('SELECT id FROM categories WHERE name = $1 AND "isDeleted" = false', [cat.name]);
    if (existing.rows.length === 0) {
      await client.query(
        'INSERT INTO categories (name, description, "isDeleted", created_at, updated_at) VALUES ($1, $2, false, NOW(), NOW())',
        [cat.name, cat.description]
      );
      console.log(`+ Added Category: ${cat.name}`);
    } else {
      console.log(`= Category already exists: ${cat.name}`);
    }
  }

  // 2. Seed Suppliers (5)
  console.log('\n--- Seeding Suppliers (5) ---');
  const suppliers = [
    {
      name: 'Công ty Cổ phần Phát hành Sách TP.HCM (Fahasa)',
      contactName: 'Nguyễn Văn Hùng',
      phone: '02838225446',
      email: 'info@fahasa.com',
      address: '60-62 Lê Lợi, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
      note: 'Đối tác phân phối sách quy mô toàn quốc, chiết khấu tốt',
    },
    {
      name: 'Nhà xuất bản Trẻ',
      contactName: 'Trần Thị Mai',
      phone: '02839316289',
      email: 'hopthubandoc@nxbtre.com.vn',
      address: '161B Lý Chính Thắng, Phường 7, Quận 3, TP. Hồ Chí Minh',
      note: 'Chuyên xuất bản sách văn học, kỹ năng và sách thiếu nhi',
    },
    {
      name: 'Công ty Cổ phần Sách Alpha (Alpha Books)',
      contactName: 'Lê Hoàng Quân',
      phone: '02437226234',
      email: 'contact@alphabooks.vn',
      address: 'Tầng 3, Dream Center Home, 11A ngõ 282 Nguyễn Huy Tưởng, Hà Nội',
      note: 'Đối tác hàng đầu về sách kinh doanh, kinh tế và tư duy lãnh đạo',
    },
    {
      name: 'Công ty Văn hóa Sáng tạo Trí Việt (First News)',
      contactName: 'Phạm Thị Lan',
      phone: '02838227979',
      email: 'triviet@firstnews.com.vn',
      address: '11H Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh',
      note: 'Đơn vị nắm bản quyền Đắc Nhân Tâm, Hạt Giống Tâm Hồn',
    },
    {
      name: 'Nhà xuất bản Kim Đồng',
      contactName: 'Vũ Minh Tuấn',
      phone: '02439434730',
      email: 'cskh_online@nxbkimdong.com.vn',
      address: '55 Quang Trung, Hai Bà Trưng, Hà Nội',
      note: 'Nhà xuất bản sách thiếu nhi, truyện tranh hàng đầu Việt Nam',
    },
  ];

  for (const sup of suppliers) {
    const existing = await client.query('SELECT id FROM suppliers WHERE name = $1 AND "isDeleted" = false', [sup.name]);
    if (existing.rows.length === 0) {
      await client.query(
        'INSERT INTO suppliers (name, "contactName", phone, email, address, note, "isDeleted", created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())',
        [sup.name, sup.contactName, sup.phone, sup.email, sup.address, sup.note]
      );
      console.log(`+ Added Supplier: ${sup.name}`);
    } else {
      console.log(`= Supplier already exists: ${sup.name}`);
    }
  }

  // 3. Seed Books (20)
  console.log('\n--- Seeding Books (20) ---');
  const books = [
    { title: 'Đắc Nhân Tâm', author: 'Dale Carnegie', category: 'Kỹ năng sống', purchasePrice: 65000, sellingPrice: 86000, stock: 45, minStock: 10 },
    { title: 'Nhà Giả Kim', author: 'Paulo Coelho', category: 'Văn học', purchasePrice: 59000, sellingPrice: 79000, stock: 32, minStock: 10 },
    { title: 'Tư Duy Nhanh Và Chậm', author: 'Daniel Kahneman', category: 'Kỹ năng sống', purchasePrice: 165000, sellingPrice: 220000, stock: 20, minStock: 5 },
    { title: 'Clean Code - Nghệ thuật viết code sạch', author: 'Robert C. Martin', category: 'Công nghệ thông tin', purchasePrice: 210000, sellingPrice: 285000, stock: 18, minStock: 5 },
    { title: 'Design Patterns - Mẫu thiết kế phần mềm', author: 'Erich Gamma', category: 'Công nghệ thông tin', purchasePrice: 240000, sellingPrice: 320000, stock: 15, minStock: 5 },
    { title: 'Dế Mèn Phiêu Lưu Ký', author: 'Tô Hoài', category: 'Thiếu nhi', purchasePrice: 38000, sellingPrice: 50000, stock: 60, minStock: 15 },
    { title: 'Hoàng Tử Bé', author: 'Antoine de Saint-Exupéry', category: 'Thiếu nhi', purchasePrice: 48000, sellingPrice: 65000, stock: 40, minStock: 10 },
    { title: 'Cha Giàu Cha Nghèo', author: 'Robert Kiyosaki', category: 'Kinh tế - Kinh doanh', purchasePrice: 90000, sellingPrice: 125000, stock: 35, minStock: 8 },
    { title: 'Kinh Tế Học Hài Hước', author: 'Steven D. Levitt', category: 'Kinh tế - Kinh doanh', purchasePrice: 110000, sellingPrice: 150000, stock: 25, minStock: 5 },
    { title: 'Từ Tốt Đến Vĩ Đại', author: 'Jim Collins', category: 'Kinh tế - Kinh doanh', purchasePrice: 135000, sellingPrice: 180000, stock: 22, minStock: 5 },
    { title: 'Tội Ác Và Trừng Phạt', author: 'Fyodor Dostoevsky', category: 'Văn học', purchasePrice: 145000, sellingPrice: 195000, stock: 14, minStock: 5 },
    { title: 'Không Gia Đình', author: 'Hector Malot', category: 'Văn học', purchasePrice: 110000, sellingPrice: 148000, stock: 28, minStock: 8 },
    { title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu', author: 'Rosie Nguyễn', category: 'Kỹ năng sống', purchasePrice: 55000, sellingPrice: 75000, stock: 50, minStock: 12 },
    { title: 'Lối Sống Tối Giản Của Người Nhật', author: 'Sasaki Fumio', category: 'Kỹ năng sống', purchasePrice: 62000, sellingPrice: 85000, stock: 30, minStock: 8 },
    { title: 'Lập Trình JavaScript Nâng Cao', author: 'Kyle Simpson', category: 'Công nghệ thông tin', purchasePrice: 175000, sellingPrice: 235000, stock: 16, minStock: 5 },
    { title: 'Khám Phá Vũ Trụ Cùng Trẻ Em', author: 'Nhiều tác giả', category: 'Thiếu nhi', purchasePrice: 85000, sellingPrice: 115000, stock: 26, minStock: 6 },
    { title: 'Khởi Nghiệp Tinh Gọn', author: 'Eric Ries', category: 'Kinh tế - Kinh doanh', purchasePrice: 105000, sellingPrice: 145000, stock: 24, minStock: 6 },
    { title: 'Chuyện Con Mèo Dạy Hải Âu Bay', author: 'Luis Sepúlveda', category: 'Thiếu nhi', purchasePrice: 42000, sellingPrice: 58000, stock: 38, minStock: 10 },
    { title: 'Rừng Na Uy', author: 'Haruki Murakami', category: 'Văn học', purchasePrice: 95000, sellingPrice: 130000, stock: 29, minStock: 7 },
    { title: 'Học Máy Và Trí Tuệ Nhân Tạo', author: 'Aurélien Géron', category: 'Công nghệ thông tin', purchasePrice: 290000, sellingPrice: 390000, stock: 12, minStock: 4 },
  ];

  for (const b of books) {
    const existing = await client.query('SELECT id FROM books WHERE title = $1', [b.title]);
    if (existing.rows.length === 0) {
      const status = b.stock === 0 ? 'OUT_OF_STOCK' : b.stock <= b.minStock ? 'LOW_STOCK' : 'IN_STOCK';
      await client.query(
        'INSERT INTO books (title, author, category, "purchasePrice", "sellingPrice", stock, "minStock", status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())',
        [b.title, b.author, b.category, b.purchasePrice, b.sellingPrice, b.stock, b.minStock, status]
      );
      console.log(`+ Added Book: ${b.title}`);
    } else {
      console.log(`= Book already exists: ${b.title}`);
    }
  }

  console.log('\n✅ Seeding completed successfully!');
  await client.end();
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
