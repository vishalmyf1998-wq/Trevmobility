const fs = require('fs');

const tables = [
  'cities', 'hubs', 'car_categories', 'cars', 'drivers', 'b2c_customers',
  'fare_groups', 'b2b_clients', 'b2b_entities', 'b2b_employees', 'airports',
  'airport_terminals', 'admin_roles', 'admin_users', 'booking_tags',
  'cancellation_policies', 'promo_codes', 'city_polygons', 'car_locations',
  'gst_configs', 'communication_templates', 'bookings', 'booking_event_logs',
  'duty_slips', 'invoices'
];

const collection = {
  info: {
    name: "Supabase CRUD API Auto-Generated",
    description: "Auto-generated Postman collection for all 25 Supabase tables.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [],
  variable: [
    {
      key: "base_url",
      value: "http://localhost:3000/api/crud",
      type: "string"
    }
  ]
};

tables.forEach(table => {
  const folder = {
    name: table,
    item: [
      {
        name: `Get All ${table}`,
        request: {
          method: "GET",
          url: { 
            raw: `{{base_url}}/${table}`, 
            host: ["{{base_url}}"], 
            path: [table] 
          }
        }
      },
      {
        name: `Get ${table} by ID`,
        request: {
          method: "GET",
          url: { 
            raw: `{{base_url}}/${table}?id=YOUR_ID_HERE`, 
            host: ["{{base_url}}"], 
            path: [table],
            query: [{ key: "id", value: "YOUR_ID_HERE" }]
          }
        }
      },
      {
        name: `Create ${table}`,
        request: {
          method: "POST",
          header: [{ key: "Content-Type", value: "application/json" }],
          body: { 
            mode: "raw", 
            raw: "{\n  \"example_field\": \"example_value\"\n}",
            options: {
              raw: {
                language: "json"
              }
            }
          },
          url: { 
            raw: `{{base_url}}/${table}`, 
            host: ["{{base_url}}"], 
            path: [table] 
          }
        }
      },
      {
        name: `Update ${table}`,
        request: {
          method: "PUT",
          header: [{ key: "Content-Type", value: "application/json" }],
          body: { 
            mode: "raw", 
            raw: "{\n  \"example_field\": \"updated_value\"\n}",
            options: {
              raw: {
                language: "json"
              }
            }
          },
          url: { 
            raw: `{{base_url}}/${table}?id=YOUR_ID_HERE`, 
            host: ["{{base_url}}"], 
            path: [table],
            query: [{ key: "id", value: "YOUR_ID_HERE" }]
          }
        }
      },
      {
        name: `Delete ${table}`,
        request: {
          method: "DELETE",
          url: { 
            raw: `{{base_url}}/${table}?id=YOUR_ID_HERE`, 
            host: ["{{base_url}}"], 
            path: [table],
            query: [{ key: "id", value: "YOUR_ID_HERE" }]
          }
        }
      }
    ]
  };
  collection.item.push(folder);
});

fs.writeFileSync('postman_collection.json', JSON.stringify(collection, null, 2));
console.log('Successfully generated postman_collection.json');
