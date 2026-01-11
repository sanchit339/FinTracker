-- Check if categories exist
SELECT * FROM categories;

-- Check if transactions have category_id assigned
SELECT id, description, amount, type, category_id FROM transactions LIMIT 10;

-- Check category distribution
SELECT c.name, COUNT(t.id) as transaction_count
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY c.name;
