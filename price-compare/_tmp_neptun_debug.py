from app.infrastructure.mongo.connection import get_database

db = get_database()
neptun_skus = set(p['product_sku'] for p in db['prices'].find({'store_code':'neptun'}, {'product_sku':1}))
print('neptun_skus', len(neptun_skus))
count = db['products'].count_documents({'sku': {'$in': list(neptun_skus)}, 'image_url': {'$exists': True, '$ne': None}})
print('neptun products with image_url', count)
for doc in db['products'].find({'sku': {'$in': list(neptun_skus)}, 'image_url': {'$exists': True, '$ne': None}}, {'sku':1,'image_url':1}).limit(5):
    print(doc)
