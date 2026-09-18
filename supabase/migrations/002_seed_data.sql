-- Seed data: 3 decks with 10 cards each
-- NOTE: Replace 'YOUR_USER_ID' with your actual Supabase auth user UUID

-- Deck 1: English-Spanish Basics
insert into decks (id, user_id, name, source_language, target_language, description, is_public) values
  ('d1000000-0000-0000-0000-000000000001', 'YOUR_USER_ID', 'English-Spanish Basics', 'en', 'es', 'Common everyday vocabulary', true);

insert into cards (deck_id, front, back, example, transcription, gender) values
  ('d1000000-0000-0000-0000-000000000001', 'Hello', 'Hola', 'Hello, how are you?', '/həˈloʊ/', null),
  ('d1000000-0000-0000-0000-000000000001', 'Goodbye', 'Adiós', 'Goodbye, see you tomorrow.', '/ɡʊdˈbaɪ/', null),
  ('d1000000-0000-0000-0000-000000000001', 'Thank you', 'Gracias', 'Thank you very much.', '/θæŋk juː/', null),
  ('d1000000-0000-0000-0000-000000000001', 'Please', 'Por favor', 'Please sit down.', '/pliːz/', null),
  ('d1000000-0000-0000-0000-000000000001', 'Yes', 'Sí', 'Yes, I agree.', '/jɛs/', null),
  ('d1000000-0000-0000-0000-000000000001', 'No', 'No', 'No, thank you.', '/noʊ/', null),
  ('d1000000-0000-0000-0000-000000000001', 'Water', 'Agua', 'Can I have some water?', '/ˈwɔːtər/', null),
  ('d1000000-0000-0000-0000-000000000001', 'Food', 'Comida', 'The food is delicious.', '/fuːd/', null),
  ('d1000000-0000-0000-0000-000000000001', 'House', 'Casa', 'This is my house.', '/haʊs/', 'f'),
  ('d1000000-0000-0000-0000-000000000001', 'Book', 'Libro', 'I am reading a book.', '/bʊk/', 'm');

-- Deck 2: English-French Travel
insert into decks (id, user_id, name, source_language, target_language, description, is_public) values
  ('d1000000-0000-0000-0000-000000000002', 'YOUR_USER_ID', 'English-French Travel', 'en', 'fr', 'Essential travel phrases', true);

insert into cards (deck_id, front, back, example, transcription, gender) values
  ('d1000000-0000-0000-0000-000000000002', 'Excuse me', 'Excusez-moi', 'Excuse me, where is the station?', '/ɪkˈskjuːz miː/', null),
  ('d1000000-0000-0000-0000-000000000002', 'How much?', 'Combien?', 'How much does this cost?', '/haʊ mʌtʃ/', null),
  ('d1000000-0000-0000-0000-000000000002', 'I would like', 'Je voudrais', 'I would like a coffee, please.', '/aɪ wʊd laɪk/', null),
  ('d1000000-0000-0000-0000-000000000002', 'Where is?', 'Où est?', 'Where is the bathroom?', '/wɛr ɪz/', null),
  ('d1000000-0000-0000-0000-000000000002', 'Good morning', 'Bonjour', 'Good morning, madam.', '/ɡʊd ˈmɔːnɪŋ/', null),
  ('d1000000-0000-0000-0000-000000000002', 'Good night', 'Bonne nuit', 'Good night, sleep well.', '/ɡʊd naɪt/', null),
  ('d1000000-0000-0000-0000-000000000002', 'Help', 'Au secours', 'Help! Please help me!', '/hɛlp/', null),
  ('d1000000-0000-0000-0000-000000000002', 'Ticket', 'Billet', 'I need a train ticket.', '/ˈtɪkɪt/', 'm'),
  ('d1000000-0000-0000-0000-000000000002', 'Restaurant', 'Restaurant', 'Is there a restaurant nearby?', '/ˈrɛstərɒnt/', 'm'),
  ('d1000000-0000-0000-0000-000000000002', 'Map', 'Carte', 'Do you have a map?', '/mæp/', 'f');

-- Deck 3: English-German Business
insert into decks (id, user_id, name, source_language, target_language, description, is_public) values
  ('d1000000-0000-0000-0000-000000000003', 'YOUR_USER_ID', 'English-German Business', 'en', 'de', 'Professional vocabulary for the workplace', true);

insert into cards (deck_id, front, back, example, transcription, gender) values
  ('d1000000-0000-0000-0000-000000000003', 'Meeting', 'Besprechung', 'The meeting is at 10 AM.', '/ˈmiːtɪŋ/', 'f'),
  ('d1000000-0000-0000-0000-000000000003', 'Email', 'E-Mail', 'Please send me an email.', '/ˈiːmeɪl/', 'f'),
  ('d1000000-0000-0000-0000-000000000003', 'Deadline', 'Frist', 'The deadline is next Friday.', '/ˈdɛdlaɪn/', 'f'),
  ('d1000000-0000-0000-0000-000000000003', 'Report', 'Bericht', 'I need to finish the report.', '/rɪˈpɔːrt/', 'm'),
  ('d1000000-0000-0000-0000-000000000003', 'Project', 'Projekt', 'The project is going well.', '/ˈprɒdʒɛkt/', 'n'),
  ('d1000000-0000-0000-0000-000000000003', 'Colleague', 'Kollege', 'My colleague is very helpful.', '/ˈkɒliːɡ/', 'm'),
  ('d1000000-0000-0000-0000-000000000003', 'Salary', 'Gehalt', 'What is your salary?', '/ˈsæləri/', 'n'),
  ('d1000000-0000-0000-0000-000000000003', 'Conference', 'Konferenz', 'The conference starts tomorrow.', '/ˈkɒnfərəns/', 'f'),
  ('d1000000-0000-0000-0000-000000000003', 'Contract', 'Vertrag', 'Please sign the contract.', '/ˈkɒntrækt/', 'm'),
  ('d1000000-0000-0000-0000-000000000003', 'Presentation', 'Präsentation', 'The presentation was excellent.', '/ˌprɛzənˈteɪʃən/', 'f');
