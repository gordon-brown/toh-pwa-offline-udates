INSERT INTO public."hero" (name) VALUES ('Judy');
INSERT INTO public."hero" (name) VALUES ('Cathy');
INSERT INTO public."hero" (name) VALUES ('Laurie');

DELETE FROM public."hero" WHERE ID = 3;

UPDATE public."hero" SET name = 'Mr. Mean' WHERE ID = 1;

--DELETE FROM public."hero" WHERE ID > 10

SELECT * FROM public."hero" ORDER BY id;
