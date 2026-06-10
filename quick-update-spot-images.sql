-- Script cập nhật nhanh hình ảnh cho Tourist Spots
-- Sử dụng SQL Server Management Studio hoặc Azure Data Studio

-- Cập nhật ảnh cho các địa điểm cụ thể
UPDATE TouristSpots 
SET ImageUrl = 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&q=80'
WHERE Name = N'Làng Rau Trà Quế';

UPDATE TouristSpots 
SET ImageUrl = 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80'
WHERE Name = N'Làng Chủ Tịch Hồ Chí Minh';

UPDATE TouristSpots 
SET ImageUrl = 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80'
WHERE Name LIKE N'%Chợ Đêm%Phú Quốc%';

UPDATE TouristSpots 
SET ImageUrl = 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=800&q=80'
WHERE Name LIKE N'%Phố Cổ%Hội An%';

-- Hoặc cập nhật theo SpotId
UPDATE TouristSpots 
SET ImageUrl = 'https://images.unsplash.com/photo-YOUR-IMAGE-ID?w=800&q=80'
WHERE SpotId = 1;

-- Kiểm tra kết quả
SELECT SpotId, Name, ImageUrl FROM TouristSpots WHERE ImageUrl LIKE '%unsplash%';
