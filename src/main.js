import "./styles/index.css";
import "./config.js"; // phải chạy trước app.js

/* Đường link có #remote=… là điện thoại điều khiển → chỉ tải giao diện điều khiển gọn nhẹ */
if (/^#remote=/.test(location.hash)) import("./remote/phone.js");
else import("./app.js");
