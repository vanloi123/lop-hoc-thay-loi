/* Bộ đề mẫu đi kèm ứng dụng */
export const SAMPLE_SETS = [
 { id: "khoa-hoc", name: "Khoa học tự nhiên", subject: "Khoa học · Lớp 5–6",
  quiz: `Nước sôi ở bao nhiêu độ C (áp suất thường)? | *100 °C | 90 °C | 80 °C | 120 °C
Hành tinh nào gần Mặt Trời nhất? | *Sao Thủy | Sao Kim | Trái Đất | Sao Hỏa
Cây xanh hấp thụ khí nào để quang hợp? | *Khí cacbonic | Khí oxi | Khí nitơ | Khí heli
Bộ phận nào bơm máu đi khắp cơ thể? | *Tim | Phổi | Gan | Dạ dày
Đơn vị đo khối lượng trong hệ SI là gì? | *Kilôgam | Mét | Giây | Lít
Vật liệu nào dẫn điện tốt? | *Đồng | Nhựa | Gỗ khô | Thủy tinh
Mặt Trăng là gì của Trái Đất? | *Vệ tinh tự nhiên | Hành tinh | Ngôi sao | Sao chổi
Nước đá chuyển thành nước lỏng gọi là gì? | *Sự nóng chảy | Sự đông đặc | Sự bay hơi | Sự ngưng tụ
Nguồn năng lượng nào là năng lượng tái tạo? | *Mặt Trời | Than đá | Dầu mỏ | Khí đốt
Động vật nào thuộc lớp thú? | *Cá heo | Cá mập | Rùa biển | Chim cánh cụt
Bộ phận nào của cây hút nước từ đất? | *Rễ | Lá | Hoa | Quả
Hành tinh lớn nhất trong Hệ Mặt Trời? | *Sao Mộc | Sao Thổ | Trái Đất | Sao Hải Vương`,
  tf: `Ánh sáng truyền nhanh hơn âm thanh. | Đ
Cá voi là một loài cá. | S
Trái Đất quay quanh Mặt Trời. | Đ
Nước nguyên chất sôi ở 50 °C. | S
Thực vật cần ánh sáng để quang hợp. | Đ
Âm thanh truyền được trong chân không. | S
Người trưởng thành có 206 chiếc xương. | Đ
Nam châm hút được đồng. | S`,
  match: `Tim = Bơm máu đi nuôi cơ thể
Phổi = Trao đổi khí
Dạ dày = Tiêu hóa thức ăn
Não = Điều khiển mọi hoạt động
Thận = Lọc máu, tạo nước tiểu
Da = Bảo vệ cơ thể`,
  sort: `Chất rắn: Hòn đá, Thanh sắt, Khúc gỗ, Viên nước đá
Chất lỏng: Nước, Dầu ăn, Sữa, Nước mắm
Chất khí: Hơi nước, Khí oxi, Khí cacbonic`,
  order: `Vòng đời của bướm: Trứng > Sâu > Nhộng > Bướm
Các hành tinh từ gần đến xa Mặt Trời: Sao Thủy > Sao Kim > Trái Đất > Sao Hỏa
Vòng tuần hoàn của nước: Nước bốc hơi > Ngưng tụ thành mây > Mưa rơi xuống > Chảy ra sông, biển
Sự lớn lên của cây: Hạt > Nảy mầm > Cây con > Cây trưởng thành > Ra hoa, kết quả`,
  words: `QUANG HỢP | Quá trình cây xanh tạo chất dinh dưỡng nhờ ánh sáng
NAM CHÂM | Vật có thể hút sắt
VI KHUẨN | Sinh vật rất nhỏ, chỉ thấy qua kính hiển vi
TRỌNG LỰC | Lực hút của Trái Đất lên mọi vật
HỆ MẶT TRỜI | Gồm Mặt Trời và tám hành tinh` },
 { id: "tieng-anh", name: "Tiếng Anh cơ bản", subject: "Tiếng Anh · Tiểu học",
  quiz: `"Apple" nghĩa là gì? | *Quả táo | Quả cam | Quả chuối | Quả nho
"Con mèo" trong tiếng Anh là? | *cat | dog | bird | fish
Số 12 trong tiếng Anh là? | *twelve | twenty | two | eleven
I ___ a student. | *am | is | are | be
Màu xanh lá cây là? | *green | blue | yellow | red
Từ trái nghĩa với "hot" là? | *cold | warm | big | fast
"Thứ Hai" trong tiếng Anh là? | *Monday | Sunday | Friday | Tuesday
Số nhiều của "child" là? | *children | childs | childes | childen
She ___ my best friend. | *is | am | are | be
"Kitchen" là phòng nào? | *Nhà bếp | Phòng ngủ | Phòng tắm | Phòng khách`,
  tf: `"Dog" nghĩa là con chó. | Đ
"Big" trái nghĩa với "small". | Đ
"She are my sister." là câu đúng. | S
"Seven" là số 6. | S
"Teacher" nghĩa là giáo viên. | Đ
"Ate" là dạng quá khứ của "eat". | Đ
"Sunday" là Thứ Bảy. | S`,
  match: `Book = Quyển sách
Pen = Cây bút
School = Trường học
Friend = Bạn bè
Water = Nước
Happy = Vui vẻ
Window = Cửa sổ`,
  sort: `Động vật: cat, dog, elephant, tiger
Màu sắc: red, blue, purple, orange
Đồ ăn: bread, rice, noodles, cake`,
  order: `Xếp thành câu đúng: I > like > to > play > football
Xếp thành câu đúng: What > is > your > name?
Các ngày trong tuần: Monday > Tuesday > Wednesday > Thursday > Friday
Các tháng đầu năm: January > February > March > April`,
  words: `ELEPHANT | Con voi
RAINBOW | Cầu vồng
TEACHER | Giáo viên
BUTTERFLY | Con bướm
LIBRARY | Thư viện
BIRTHDAY | Sinh nhật` },
 { id: "su-dia", name: "Lịch sử & Địa lý Việt Nam", subject: "Lịch sử – Địa lý · Lớp 4–5",
  quiz: `Thủ đô của Việt Nam là? | *Hà Nội | TP. Hồ Chí Minh | Huế | Đà Nẵng
Đỉnh núi cao nhất Việt Nam là? | *Phan Xi Păng | Bà Đen | Ngọc Linh | Bạch Mã
Chiến thắng Điện Biên Phủ diễn ra năm nào? | *1954 | 1945 | 1975 | 1968
Ngày Quốc khánh Việt Nam là ngày nào? | *2/9 | 30/4 | 1/5 | 19/8
Ai đọc bản Tuyên ngôn Độc lập năm 1945? | *Chủ tịch Hồ Chí Minh | Võ Nguyên Giáp | Phạm Văn Đồng | Trường Chinh
Việt Nam nằm ở khu vực nào? | *Đông Nam Á | Nam Á | Đông Á | Trung Á
Nhà nước đầu tiên của người Việt là? | *Văn Lang | Âu Lạc | Đại Việt | Vạn Xuân
Sông nào chảy qua Đồng bằng sông Cửu Long? | *Sông Mê Công | Sông Hồng | Sông Đà | Sông Hương
Vua Lý Thái Tổ dời đô về đâu? | *Thăng Long | Hoa Lư | Phú Xuân | Cổ Loa`,
  tf: `Lãnh thổ Việt Nam có hình chữ S. | Đ
Hà Nội nằm ở miền Nam. | S
Ngày 30/4/1975 là ngày giải phóng miền Nam. | Đ
Phan Xi Păng nằm trên dãy Hoàng Liên Sơn. | Đ
Biển Đông nằm ở phía tây Việt Nam. | S
Các vua Hùng dựng nước Văn Lang. | Đ
Ngô Quyền đánh thắng quân Nam Hán trên sông Bạch Đằng. | Đ`,
  match: `Hai Bà Trưng = Khởi nghĩa năm 40
Ngô Quyền = Chiến thắng Bạch Đằng năm 938
Lý Thái Tổ = Dời đô về Thăng Long
Trần Hưng Đạo = Viết Hịch tướng sĩ
Lê Lợi = Khởi nghĩa Lam Sơn
Quang Trung = Đại phá quân Thanh năm 1789`,
  sort: `Miền Bắc: Hà Nội, Hải Phòng, Lào Cai
Miền Trung: Huế, Đà Nẵng, Nghệ An
Miền Nam: Cần Thơ, TP. Hồ Chí Minh, Cà Mau`,
  order: `Các triều đại theo thời gian: Nhà Đinh > Nhà Tiền Lê > Nhà Lý > Nhà Trần
Các sự kiện theo thời gian: Khởi nghĩa Hai Bà Trưng > Chiến thắng Bạch Đằng 938 > Dời đô về Thăng Long > Khởi nghĩa Lam Sơn
Các thành phố từ Bắc vào Nam: Hà Nội > Huế > Đà Nẵng > TP. Hồ Chí Minh > Cà Mau
Các mốc lịch sử: 1945 > 1954 > 1975`,
  words: `VĂN LANG | Nhà nước đầu tiên của người Việt
THĂNG LONG | Tên của Hà Nội thời nhà Lý
HẠ LONG | Vịnh là Di sản thiên nhiên thế giới
ĐIỆN BIÊN PHỦ | Chiến thắng "lừng lẫy năm châu" năm 1954
BẠCH ĐẰNG | Dòng sông ba lần chứng kiến chiến thắng cọc gỗ` },
 { id: "toan", name: "Toán vui", subject: "Toán · Lớp 4–6",
  quiz: `7 × 8 = ? | *56 | 54 | 48 | 64
1/2 + 1/4 = ? | *3/4 | 2/6 | 1/6 | 2/4
Hình có 3 cạnh gọi là? | *Hình tam giác | Hình tứ giác | Hình ngũ giác | Hình tròn
25% của 200 là? | *50 | 25 | 100 | 75
Chu vi hình vuông cạnh 5 cm là? | *20 cm | 25 cm | 10 cm | 15 cm
1 giờ bằng bao nhiêu phút? | *60 | 100 | 30 | 120
Số nguyên tố nhỏ nhất là? | *2 | 1 | 3 | 0
0,5 viết thành phân số là? | *1/2 | 1/5 | 5/1 | 1/4
Diện tích hình chữ nhật 4 cm × 6 cm là? | *24 cm² | 20 cm² | 10 cm² | 48 cm²
144 : 12 = ? | *12 | 14 | 11 | 13`,
  tf: `9 là số nguyên tố. | S
Tổng ba góc trong một tam giác bằng 180°. | Đ
1 km = 1000 m. | Đ
3² = 6. | S
Hình vuông là một hình chữ nhật đặc biệt. | Đ
0 chia cho 5 bằng 0. | Đ
Số 1 là số nguyên tố. | S`,
  match: `Hình tam giác = 3 cạnh
Hình vuông = 4 cạnh bằng nhau
Hình ngũ giác = 5 cạnh
Hình lục giác = 6 cạnh
Hình bát giác = 8 cạnh`,
  sort: `Số chẵn: 12, 48, 100, 36
Số lẻ: 7, 35, 91, 53`,
  order: `Từ bé đến lớn: 0,25 > 1/2 > 0,75 > 1
Từ bé đến lớn: 12 > 21 > 102 > 120 > 201
Đơn vị độ dài từ nhỏ đến lớn: mm > cm > dm > m > km
Thứ tự thực hiện phép tính: Trong ngoặc > Nhân, chia > Cộng, trừ`,
  words: `PHÂN SỐ | Dạng a/b với b khác 0
CHU VI | Tổng độ dài các cạnh của một hình
DIỆN TÍCH | Độ lớn phần mặt phẳng mà hình chiếm
HÌNH THANG | Tứ giác có một cặp cạnh đối song song
SỐ NGUYÊN TỐ | Số chỉ chia hết cho 1 và chính nó` }
];
