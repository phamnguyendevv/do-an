const API_BASE = 'https://api.zymail.site/api/v1'

const categoriesData = [
  {
    name: 'Văn học & Tiểu thuyết',
    description: 'Các tác phẩm văn học trong nước và quốc tế, tiểu thuyết, truyện ngắn đặc sắc',
  },
  {
    name: 'Kinh tế & Kinh doanh',
    description: 'Sách về quản trị kinh doanh, tài chính, đầu tư, khởi nghiệp và marketing',
  },
  {
    name: 'Công nghệ thông tin',
    description: 'Sách lập trình, kiến trúc phần mềm, trí tuệ nhân tạo, an toàn thông tin',
  },
  {
    name: 'Kỹ năng sống & Phát triển bản thân',
    description: 'Sách rèn luyện tư duy, kỹ năng giao tiếp, quản lý thời gian và phát triển bản thân',
  },
]

const suppliersData = [
  {
    name: 'Nhà Xuất Bản Trẻ',
    contactName: 'Nguyễn Văn Minh',
    phone: '02839316289',
    email: 'hopthu@nxbtre.com.vn',
    address: '161B Lý Chính Thắng, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
    note: 'Đối tác xuất bản sách văn học, kinh tế và kỹ năng',
  },
  {
    name: 'Nhà Xuất Bản Kim Đồng',
    contactName: 'Trần Thị Thu Hà',
    phone: '02439434730',
    email: 'cskh_online@nxbkimdong.com.vn',
    address: '55 Quang Trung, Phường Nguyễn Du, Quận Hai Bà Trưng, Hà Nội',
    note: 'Nhà xuất bản sách thiếu nhi, truyện tranh và văn học tuổi trẻ',
  },
  {
    name: 'Công Ty Cổ Phần Sách Nhã Nam',
    contactName: 'Lê Hoàng Long',
    phone: '02435146875',
    email: 'contact@nhanam.vn',
    address: '59 Đỗ Quang, Trung Hòa, Cầu Giấy, Hà Nội',
    note: 'Đơn vị phát hành văn học kinh điển và phi hư cấu chất lượng cao',
  },
  {
    name: 'First News - Trí Việt',
    contactName: 'Nguyễn Văn Phước',
    phone: '02838227979',
    email: 'triviet@firstnews.com.vn',
    address: '11H Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    note: 'Chuyên dòng sách kỹ năng sống Đắc Nhân Tâm, Hạt Giống Tâm Hồn',
  },
  {
    name: 'Công Ty Sách Alpha Books',
    contactName: 'Phạm Thị Mai',
    phone: '0932329959',
    email: 'support@alphabooks.vn',
    address: 'Tầng 3, Dream Center Home, 11A ngõ 282 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội',
    note: 'Hàng đầu về sách kinh tế, quản trị và khởi nghiệp',
  },
  {
    name: 'Nhà Xuất Bản Tổng Hợp TP.HCM',
    contactName: 'Đỗ Thanh Tùng',
    phone: '02838225340',
    email: 'tonghop@nxbhcm.com.vn',
    address: '62 Nguyễn Thị Minh Khai, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
    note: 'Nhà xuất bản các công trình nghiên cứu, lịch sử, văn hóa',
  },
  {
    name: 'Công Ty Sách Thái Hà (ThaiHaBooks)',
    contactName: 'Vũ Thị Phương',
    phone: '02437930480',
    email: 'contact@thaihabooks.com',
    address: 'Lô B2-08, Vinhomes Gardenia, Đường Hàm Nghi, Cầu Diễn, Hà Nội',
    note: 'Dòng sách phật giáo, nuôi dạy con, văn hóa và kinh doanh',
  },
]

const booksTemplate = [
  // Văn học & Tiểu thuyết
  {
    title: 'Dế Mèn Phiêu Lưu Ký',
    author: 'Tô Hoài',
    publisher: 'NXB Kim Đồng',
    isbn: '978-604-2-22534-1',
    categoryName: 'Văn học & Tiểu thuyết',
    purchasePrice: 28000,
    sellingPrice: 45000,
    stock: 80,
    minStock: 15,
  },
  {
    title: 'Mắt Biếc',
    author: 'Nguyễn Nhật Ánh',
    publisher: 'NXB Trẻ',
    isbn: '978-604-1-15584-0',
    categoryName: 'Văn học & Tiểu thuyết',
    purchasePrice: 65000,
    sellingPrice: 110000,
    stock: 65,
    minStock: 10,
  },
  {
    title: 'Số Đỏ',
    author: 'Vũ Trọng Phụng',
    publisher: 'NXB Văn Học',
    isbn: '978-604-9-67219-5',
    categoryName: 'Văn học & Tiểu thuyết',
    purchasePrice: 38000,
    sellingPrice: 60000,
    stock: 45,
    minStock: 10,
  },
  {
    title: 'Cánh Đồng Bất Tận',
    author: 'Nguyễn Ngọc Tư',
    publisher: 'NXB Trẻ',
    isbn: '978-604-1-08992-3',
    categoryName: 'Văn học & Tiểu thuyết',
    purchasePrice: 50000,
    sellingPrice: 85000,
    stock: 50,
    minStock: 10,
  },
  // Kinh tế & Kinh doanh
  {
    title: 'Khởi Nghiệp Tinh Gọn',
    author: 'Eric Ries',
    publisher: 'Alpha Books',
    isbn: '978-604-3-35612-4',
    categoryName: 'Kinh tế & Kinh doanh',
    purchasePrice: 105000,
    sellingPrice: 169000,
    stock: 40,
    minStock: 10,
  },
  {
    title: 'Nhà Đầu Tư Thông Minh',
    author: 'Benjamin Graham',
    publisher: 'NXB Trẻ',
    isbn: '978-604-1-18239-6',
    categoryName: 'Kinh tế & Kinh doanh',
    purchasePrice: 125000,
    sellingPrice: 195000,
    stock: 35,
    minStock: 8,
  },
  {
    title: 'Dốc Hết Trái Tim (Starbucks)',
    author: 'Howard Schultz',
    publisher: 'First News',
    isbn: '978-604-5-89412-2',
    categoryName: 'Kinh tế & Kinh doanh',
    purchasePrice: 85000,
    sellingPrice: 138000,
    stock: 30,
    minStock: 5,
  },
  {
    title: 'Tư Duy Nhanh Và Chậm',
    author: 'Daniel Kahneman',
    publisher: 'Alpha Books',
    isbn: '978-604-7-73891-2',
    categoryName: 'Kinh tế & Kinh doanh',
    purchasePrice: 120000,
    sellingPrice: 189000,
    stock: 25,
    minStock: 5,
  },
  // Công nghệ thông tin
  {
    title: 'Clean Code - Mã Sạch',
    author: 'Robert C. Martin',
    publisher: 'NXB Khoa Học Kỹ Thuật',
    isbn: '978-604-6-71280-9',
    categoryName: 'Công nghệ thông tin',
    purchasePrice: 130000,
    sellingPrice: 199000,
    stock: 30,
    minStock: 8,
  },
  {
    title: 'Lập Trình Web Cơ Bản Với JavaScript',
    author: 'Phạm Minh Tuấn',
    publisher: 'NXB Bách Khoa Hà Nội',
    isbn: '978-604-9-54321-1',
    categoryName: 'Công nghệ thông tin',
    purchasePrice: 55000,
    sellingPrice: 89000,
    stock: 60,
    minStock: 15,
  },
  {
    title: 'Git Và GitHub Cho Người Mới Bắt Đầu',
    author: 'Lê Hoàng Long',
    publisher: 'NXB Thông Tin & Truyền Thông',
    isbn: '978-604-8-03456-7',
    categoryName: 'Công nghệ thông tin',
    purchasePrice: 42000,
    sellingPrice: 72000,
    stock: 50,
    minStock: 10,
  },
  // Kỹ năng sống & Phát triển bản thân
  {
    title: 'Đắc Nhân Tâm',
    author: 'Dale Carnegie',
    publisher: 'First News',
    isbn: '978-604-5-89823-6',
    categoryName: 'Kỹ năng sống & Phát triển bản thân',
    purchasePrice: 52000,
    sellingPrice: 86000,
    stock: 120,
    minStock: 25,
  },
  {
    title: 'Tuần Làm Việc 4 Giờ',
    author: 'Timothy Ferriss',
    publisher: 'ThaiHaBooks',
    isbn: '978-604-9-87654-3',
    categoryName: 'Kỹ năng sống & Phát triển bản thân',
    purchasePrice: 95000,
    sellingPrice: 155000,
    stock: 40,
    minStock: 10,
  },
  {
    title: 'Quẳng Gánh Lo Đi Và Vui Sống',
    author: 'Dale Carnegie',
    publisher: 'First News',
    isbn: '978-604-5-89824-3',
    categoryName: 'Kỹ năng sống & Phát triển bản thân',
    purchasePrice: 48000,
    sellingPrice: 78000,
    stock: 90,
    minStock: 20,
  },
]

async function main() {
  console.log('🚀 Đang kết nối tới VPS API:', API_BASE)

  // 1. Đăng nhập để lấy Access Token
  console.log('🔑 Đang đăng nhập tài khoản admin...')
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }),
  })

  if (!loginRes.ok) {
    throw new Error(`Đăng nhập thất bại: ${loginRes.status} ${await loginRes.text()}`)
  }

  const loginJson = await loginRes.json()
  const token = loginJson.data?.token?.accessToken
  if (!token) throw new Error('Không lấy được access token')

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  // 2. Thêm 4 danh mục
  console.log('\n📂 Bắt đầu tạo 4 danh mục...')
  const categoryMap = new Map()

  // Kiểm tra danh mục hiện có
  const existingCatRes = await fetch(`${API_BASE}/admin/categories?size=100`, { headers: authHeaders })
  const existingCatJson = await existingCatRes.json()
  const existingCats = existingCatJson.data?.data || []
  for (const cat of existingCats) {
    categoryMap.set(cat.name, cat.id)
  }

  for (const cat of categoriesData) {
    if (categoryMap.has(cat.name)) {
      console.log(`  ✓ Đã tồn tại danh mục: "${cat.name}" (ID: ${categoryMap.get(cat.name)})`)
      continue
    }
    const res = await fetch(`${API_BASE}/admin/categories`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(cat),
    })
    const resJson = await res.json()
    if (!res.ok) {
      console.error(`  ✗ Thất bại tạo danh mục "${cat.name}":`, resJson)
    } else {
      const created = resJson.data?.data || resJson.data || resJson
      const id = created.id
      categoryMap.set(cat.name, id)
      console.log(`  ✓ Tạo thành công danh mục: "${cat.name}" (ID: ${id})`)
    }
  }

  // 3. Thêm 7 nhà cung cấp
  console.log('\n🏭 Bắt đầu tạo 7 nhà cung cấp...')
  const existingSupRes = await fetch(`${API_BASE}/admin/suppliers?size=100`, { headers: authHeaders })
  const existingSupJson = await existingSupRes.json()
  const existingSups = existingSupJson.data?.data || []
  const existingSupNames = new Set(existingSups.map((s) => s.name))

  for (const sup of suppliersData) {
    if (existingSupNames.has(sup.name)) {
      console.log(`  ✓ Đã tồn tại nhà cung cấp: "${sup.name}"`)
      continue
    }
    const res = await fetch(`${API_BASE}/admin/suppliers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(sup),
    })
    const resJson = await res.json()
    if (!res.ok) {
      console.error(`  ✗ Thất bại tạo nhà cung cấp "${sup.name}":`, resJson)
    } else {
      const created = resJson.data?.data || resJson.data || resJson
      console.log(`  ✓ Tạo thành công nhà cung cấp: "${sup.name}" (ID: ${created.id})`)
    }
  }

  // 4. Thêm 14 quyển sách
  console.log('\n📚 Bắt đầu tạo 14 quyển sách...')
  const existingBooksRes = await fetch(`${API_BASE}/admin/books?size=100`, { headers: authHeaders })
  const existingBooksJson = await existingBooksRes.json()
  const existingBooks = existingBooksJson.data?.data || []
  const existingBookTitles = new Set(existingBooks.map((b) => b.title))

  for (const b of booksTemplate) {
    if (existingBookTitles.has(b.title)) {
      console.log(`  ✓ Đã tồn tại sách: "${b.title}"`)
      continue
    }

    const categoryId = categoryMap.get(b.categoryName)
    const payload = {
      title: b.title,
      author: b.author,
      publisher: b.publisher,
      isbn: b.isbn,
      category: b.categoryName,
      categoryId: categoryId ? Number(categoryId) : undefined,
      purchasePrice: b.purchasePrice,
      sellingPrice: b.sellingPrice,
      stock: b.stock,
      minStock: b.minStock,
    }

    const res = await fetch(`${API_BASE}/admin/books`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    })
    const resJson = await res.json()
    if (!res.ok) {
      console.error(`  ✗ Thất bại tạo sách "${b.title}":`, resJson)
    } else {
      const created = resJson.data?.data || resJson.data || resJson
      console.log(`  ✓ Tạo thành công sách: "${b.title}" - Giá bán: ${b.sellingPrice.toLocaleString('vi-VN')} đ (ID: ${created.id})`)
    }
  }

  console.log('\n🎉 Hoàn thành nạp dữ liệu lên VPS!')
}

main().catch((err) => {
  console.error('❌ Lỗi:', err)
  process.exit(1)
})
