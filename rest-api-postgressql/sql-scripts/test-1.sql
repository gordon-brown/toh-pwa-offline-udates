INSERT INTO HeroDb.dbo.Hero VALUES ('Judy')
INSERT INTO HeroDb.dbo.Hero VALUES ('Cathy')
INSERT INTO HeroDb.dbo.Hero VALUES ('Laurie')

DELETE FROM HeroDb.dbo.Hero WHERE ID = 3

UPDATE HeroDb.dbo.Hero SET name = 'Mr. Mean' WHERE ID = 1

--DELETE FROM HeroDb.dbo.Hero WHERE ID > 10

SELECT *
FROM HeroDb.dbo.Hero
