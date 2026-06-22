import os
import requests
from sqlalchemy import create_engine, text

# 1. ĐIỀN THÔNG TIN CỦA SẾP VÀO ĐÂY
# Link Supabase chuẩn IPv4 (cái sếp vừa lấy ở bước trước)
DATABASE_URL = "postgresql://postgres.pgdgkwxvqeyngmzxnonq:Binhsieucapvippro@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

# Link Direct URL của Hugging Face (có dấu / ở cuối)
HF_BASE_URL = "https://binhhn21-water-check-in-backend.hf.space"

# Thư mục trên máy sếp để chứa ảnh tải về
SAVE_DIR = "/home/binhhn21/Pictures/water-check-in/"

def dong_bo_anh():
    print("🚀 Bắt đầu quét ảnh trên mây...")
    os.makedirs(SAVE_DIR, exist_ok=True)
    
    # Kết nối trực tiếp vào Database của sếp
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # LƯU Ý: Thay 'check_ins', 'created_at', 'image_path' cho đúng với tên trong Database của sếp
        result = conn.execute(text("SELECT timestamp, image_path FROM checkins WHERE image_path IS NOT NULL"))
        
        for row in result:
            ngay_chup = row[0].date().strftime("%Y-%m-%d") # Lấy ra ngày YYYY-MM-DD
            duong_dan_anh = row[1] 
            
            # Tạo thư mục theo ngày chụp (ví dụ: 2026-06-22)
            thu_muc_ngay = os.path.join(SAVE_DIR, ngay_chup)
            os.makedirs(thu_muc_ngay, exist_ok=True)
            
            # Khớp tên file và tạo link tải
            ten_file = os.path.basename(duong_dan_anh)
            duong_dan_luu = os.path.join(thu_muc_ngay, ten_file)
            link_tai_full = f"{HF_BASE_URL}{duong_dan_anh}"
            
            # Kiểm tra nếu máy sếp chưa có file này thì mới tải (tránh tải lại ảnh cũ)
            if not os.path.exists(duong_dan_luu):
                print(f"📥 Đang tải ảnh: {ten_file} vào {ngay_chup}...")
                print(f"🔗 Đang dò link: {link_tai_full}") # Bắt nó in link ra
                try:
                    response = requests.get(link_tai_full, timeout=10)
                    if response.status_code == 200:
                        with open(duong_dan_luu, 'wb') as f:
                            f.write(response.content)
                        print("   ✅ Tải thành công!")
                    else:
                        print(f"   ⚠️ Lỗi {response.status_code}: Không tìm thấy ảnh trên mây!")
                except Exception as e:
                    print(f"   ❌ Lỗi mạng: {e}")

if __name__ == "__main__":
    dong_bo_anh()
    print("✅ Đã kiểm tra và đồng bộ xong toàn bộ ảnh!")