"""
Seed script to populate SnapAlign product catalog with SEO-optimized names
Creates 50-100 products across multiple brands, phone models (2022+), and categories
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Phone models launched 2022+ for Top 10 brands
PHONE_MODELS = {
    "Apple": ["iPhone 17", "iPhone 17 Plus", "iPhone 17 Pro", "iPhone 17 Pro Max", "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max"],
    "Samsung": ["Galaxy S25 Ultra", "Galaxy S25 Plus", "Galaxy S25", "Galaxy S24 Ultra", "Galaxy S24 Plus", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23 Plus", "Galaxy S23", "Galaxy Z Fold 6", "Galaxy Z Flip 6", "Galaxy A55", "Galaxy A54", "Galaxy A35"],
    "OnePlus": ["OnePlus 13", "OnePlus 13R", "OnePlus 12", "OnePlus 12R", "OnePlus 11", "OnePlus 11R", "OnePlus Nord 4", "OnePlus Nord 3", "OnePlus Open"],
    "Xiaomi": ["Xiaomi 15 Ultra", "Xiaomi 15 Pro", "Xiaomi 14 Ultra", "Xiaomi 14 Pro", "Xiaomi 14", "Xiaomi 13 Ultra", "Xiaomi 13 Pro", "Redmi Note 14 Pro", "Redmi Note 13 Pro"],
    "Google": ["Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9", "Pixel 8 Pro", "Pixel 8", "Pixel 8a", "Pixel 7 Pro", "Pixel 7", "Pixel 7a", "Pixel Fold"],
    "Vivo": ["Vivo X200 Pro", "Vivo X100 Pro", "Vivo X100", "Vivo V40 Pro", "Vivo V30 Pro", "Vivo V30", "Vivo T3 Ultra", "Vivo T3 Pro"],
    "Oppo": ["Oppo Find X8 Pro", "Oppo Find X7 Ultra", "Oppo Reno 12 Pro", "Oppo Reno 11 Pro", "Oppo F27 Pro", "Oppo A3 Pro"],
    "Realme": ["Realme GT 7 Pro", "Realme GT 6", "Realme 13 Pro Plus", "Realme 12 Pro Plus", "Realme Narzo 70 Pro", "Realme 11 Pro"],
    "Motorola": ["Motorola Edge 50 Ultra", "Motorola Edge 50 Pro", "Motorola Razr 50 Ultra", "Motorola Edge 40 Pro", "Motorola G85"],
    "Nothing": ["Nothing Phone 3", "Nothing Phone 2a Plus", "Nothing Phone 2a", "Nothing Phone 2", "Nothing Phone 1"]
}

# Product types with subcategories
PRODUCT_CATEGORIES = {
    "Tempered Glass": {
        "subcategories": ["UV Glass", "Privacy Glass", "HD Glass", "Anti-Glare Glass", "Blue Light Filter", "2.5D Edge", "Full Coverage"],
        "base_price": 299,
        "price_range": (249, 599)
    },
    "Cases": {
        "subcategories": ["Leather Case", "Silicon Case", "TPU Case", "Hard Case", "Soft Case", "Shockproof Case", "Clear Case", "MagSafe Compatible"],
        "base_price": 499,
        "price_range": (349, 999)
    },
    "Camera Lens Protector": {
        "subcategories": ["HD Lens Protector", "Sapphire Lens Guard", "Tempered Lens Cover"],
        "base_price": 199,
        "price_range": (149, 399)
    },
    "Screen Protector": {
        "subcategories": ["Matte Protector", "Glossy Protector", "Hydrogel Film", "Nano Glass"],
        "base_price": 249,
        "price_range": (199, 499)
    }
}

def get_product_image_url(category, brand, model):
    """Get appropriate generic product image based on category"""
    # Use real product images from Unsplash
    category_images = {
        "Tempered Glass": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=500&fit=crop",
        "Cases": "https://images.unsplash.com/photo-1574683189522-9c5a95f78b76?w=400&h=500&fit=crop",
        "Camera Lens Protector": "https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=400&h=500&fit=crop",
        "Screen Protector": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=500&fit=crop"
    }
    return category_images.get(category, "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=500&fit=crop")

def generate_seo_optimized_name(brand, model, category, subcategory):
    """
    Generate SEO-optimized product names to rank for searches like:
    "tempered glass iphone 13 snapalign"
    """
    # Pattern: "{Subcategory} for {Brand} {Model} - SnapAlign"
    return f"{subcategory} for {brand} {model} - SnapAlign"

def generate_product_description(brand, model, category, subcategory):
    """Generate SEO-rich product descriptions"""
    descriptions = {
        "Tempered Glass": f"Premium {subcategory.lower()} screen protector for {brand} {model}. 9H hardness, scratch-resistant, crystal clear display protection. Engineered for perfect fit with {model}. Easy bubble-free installation. Protect your {brand} {model} with SnapAlign quality.",
        "Cases": f"Durable {subcategory.lower()} for {brand} {model}. Slim design, precise cutouts, enhanced grip. Military-grade drop protection for your {model}. Premium {brand} {model} case by SnapAlign.",
        "Camera Lens Protector": f"Ultra-clear {subcategory.lower()} for {brand} {model} camera. Scratch-proof, maintains photo quality. Designed specifically for {model} camera module. Keep your {brand} {model} camera pristine with SnapAlign protection.",
        "Screen Protector": f"Advanced {subcategory.lower()} for {brand} {model}. Self-healing technology, fingerprint-resistant coating. Full screen coverage for {model}. SnapAlign quality for your {brand} device."
    }
    return descriptions.get(category, f"High-quality {subcategory} for {brand} {model}")

async def seed_products():
    """Generate and insert 50-100 products with SEO optimization"""
    products = []
    product_count = 0
    
    print("🌱 Generating SEO-optimized product catalog...")
    
    # Generate products for each brand-model-category combination
    for brand, models in PHONE_MODELS.items():
        for model in models[:3]:  # Top 3 models per brand for manageability
            for category, details in PRODUCT_CATEGORIES.items():
                # Select 2 subcategories per category to reach ~80 products
                for subcategory in details["subcategories"][:2]:
                    price_min, price_max = details["price_range"]
                    compare_price = price_max + 200  # Show discount
                    
                    base_img = get_product_image_url(category, brand, model)
                    
                    product = {
                        "id": str(uuid.uuid4()),
                        "product_id": str(uuid.uuid4()),  # Add product_id for compatibility
                        "name": generate_seo_optimized_name(brand, model, category, subcategory),
                        "description": generate_product_description(brand, model, category, subcategory),
                        "price": price_min + 50,  # Slightly above minimum
                        "compare_at_price": compare_price,
                        "cost_price": price_min - 100,  # Internal cost
                        "category": category,
                        "subcategory": subcategory,
                        "brand": brand,
                        "device_model": model,
                        "image": base_img,
                        "images": [base_img, base_img],
                        "stock": 50,
                        "featured": product_count < 12,  # First 12 are featured
                        "bin_location": f"A{(product_count % 10) + 1}",
                        "rating": 4.5,
                        "avg_rating": 4.5,  # Add for compatibility
                        "reviews_count": 127,
                        "review_count": 127,  # Add for compatibility
                        "seo_keywords": f"{subcategory}, {brand} {model}, {category}, SnapAlign, screen protection, phone accessories",
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    products.append(product)
                    product_count += 1
                    
                    # Stop at 100 products
                    if product_count >= 100:
                        break
                if product_count >= 100:
                    break
            if product_count >= 100:
                break
        if product_count >= 100:
            break
    
    # Insert products into MongoDB
    print(f"📦 Inserting {len(products)} products into database...")
    
    # Clear existing products for fresh start
    deleted = await db.products.delete_many({})
    print(f"🗑️  Cleared {deleted.deleted_count} existing products")
    
    result = await db.products.insert_many(products)
    
    print(f"✅ Successfully seeded {len(result.inserted_ids)} products!")
    print(f"📊 Breakdown:")
    print(f"   - Brands: {len(PHONE_MODELS)}")
    print(f"   - Categories: {len(PRODUCT_CATEGORIES)}")
    print(f"   - Total Products: {len(products)}")
    print(f"\n🔍 SEO Example:")
    print(f"   Name: {products[0]['name']}")
    print(f"   Keywords: {products[0]['seo_keywords']}")

if __name__ == "__main__":
    asyncio.run(seed_products())
