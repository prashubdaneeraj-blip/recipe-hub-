import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
await mongoose.connect(process.env.MONGO_URI);
const U = mongoose.connection.collection('users'), R = mongoose.connection.collection('recipes');
if (!(await U.findOne({ email: 'chef@recipehub.dev' }))) {
  const { insertedId } = await U.insertOne({ name: 'Demo Chef', email: 'chef@recipehub.dev', password: await bcrypt.hash('chef1234', 10) });
  const now = new Date(), mk = (title, category, cookTime, servings, description, ingredients, steps) =>
    ({ title, category, cookTime, servings, description, image: '', ingredients, steps, author: insertedId, likes: [], createdAt: now, updatedAt: now });
  await R.insertMany([
    mk('Masala Chai', 'Drinks', 10, 2, 'Spiced milk tea, the way it is made at street stalls.', ['2 cups water', '1 cup milk', '2 tsp tea leaves', '4 cardamom pods', '1 inch ginger', 'Sugar to taste'], ['Boil water with crushed cardamom and ginger.', 'Add tea leaves and simmer 2 minutes.', 'Pour in milk and bring to a boil.', 'Sweeten, strain and serve hot.']),
    mk('Poha', 'Breakfast', 20, 2, 'Light flattened-rice breakfast with peanuts and lemon.', ['2 cups thick poha', '1 onion, chopped', '2 tbsp peanuts', '1 tsp mustard seeds', '1/2 tsp turmeric', 'Lemon and coriander'], ['Rinse poha and let it drain 5 minutes.', 'Temper mustard seeds and peanuts in oil.', 'Add onion and turmeric, cook until soft.', 'Fold in poha and salt, steam 2 minutes.', 'Finish with lemon and coriander.']),
    mk('Paneer Butter Masala', 'Dinner', 40, 4, 'Creamy tomato gravy with soft paneer cubes.', ['250 g paneer', '4 tomatoes', '2 tbsp butter', '1/2 cup cream', '1 tsp garam masala', '1 tsp kasuri methi'], ['Blend boiled tomatoes into a puree.', 'Cook puree in butter with spices for 10 minutes.', 'Add cream and paneer, simmer 5 minutes.', 'Finish with kasuri methi and serve with naan.']),
    mk('Gulab Jamun', 'Dessert', 50, 6, 'Fried milk dumplings soaked in rose-cardamom syrup.', ['1 cup milk powder', '1/4 cup flour', '1/4 cup milk', '1 cup sugar', '1 cup water', '3 cardamom pods'], ['Knead a soft dough from milk powder, flour and milk.', 'Roll into smooth balls without cracks.', 'Boil sugar, water and cardamom into a light syrup.', 'Fry balls on low heat until deep golden.', 'Soak in warm syrup for 1 hour.']),
  ]);
  console.log('Seeded demo data. Login: chef@recipehub.dev / chef1234');
} else console.log('Already seeded.');
await mongoose.disconnect();
