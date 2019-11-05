use HeroDb;
go

TRUNCATE TABLE Hero

declare @heroes nvarchar(4000) =
N'[
    { "name": "Mr. Nice" },
    { "name": "Narco" },
    { "name": "Bombasto" },
    { "name": "Celeritas" },
    { "name": "Magneta" },
    { "name": "RubberMan" },
    { "name": "Dynama" },
    { "name": "Dr IQ" },
    { "name": "Magma" },
    { "name": "Tornado" }
]';

insert into Hero(name)
select name
from openjson(@heroes) with (name nvarchar(40));

SELECT *
FROM Hero;
GO
