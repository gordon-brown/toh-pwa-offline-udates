using Belgrade.SqlClient;
using Microsoft.AspNetCore.Mvc;
using System.Data.SqlClient;
using System.IO;
using System.Threading.Tasks;

// For more information on enabling Web API for empty projects, visit http://go.microsoft.com/fwlink/?LinkID=397860

namespace AngularHeroApp.Controllers
{
    [Route("api/[controller]")]
    public class HeroesController : Controller
    {
        private readonly IQueryPipe SqlPipe;
        private readonly ICommand SqlCommand;

        public HeroesController(ICommand sqlCommand, IQueryPipe sqlPipe)
        {
            this.SqlCommand = sqlCommand;
            this.SqlPipe = sqlPipe;
        }

        // GET: api/heroes[?name=<<name>>]
        [HttpGet]
        public async Task Get(string name)
        {
            if(string.IsNullOrEmpty(name))
                await SqlPipe.Stream("SELECT json_build_object(id, name) FROM hero", Response.Body, "[]");
            else
            {
                var cmd = new SqlCommand(@"SELECT json_build_object(id, name) FROM hero WHERE name LIKE @name");
                cmd.Parameters.AddWithValue("name", "%"+name+"%");
                await SqlPipe.Stream(cmd, Response.Body, "[]");
            }
        }

        // GET api/heroes/5
        [HttpGet("{id}")]
        public async Task Get(int id)
        {
            await SqlPipe.Stream("select row_to_json(hero) from hero WHERE ID = " + id, Response.Body, "{}");
        }

        // POST api/heroes
        [HttpPost]
        public async Task Post()
        {
            string hero = new StreamReader(Request.Body).ReadToEnd();
            var cmd = new SqlCommand(@"EXEC InsertHero @hero");
            cmd.Parameters.AddWithValue("hero", hero);
            await SqlPipe.Stream(cmd,Response.Body,"{}");
        }

        // PUT api/heroes/5
        [HttpPut("{id}")]
        public async Task Put()
        {
            string hero = new StreamReader(Request.Body).ReadToEnd();
            var cmd = new SqlCommand(@"
WITH json_heroes AS (SELECT @hero::JSON json_hero)
UPDATE hero
SET name = (SELECT json_hero ->> 'name' FROM json_heroes)
WHERE id = (SELECT CAST (json_hero ->> 'id' AS INTEGER) FROM json_heroes)");
            cmd.Parameters.AddWithValue("hero", hero);
            await SqlCommand.ExecuteNonQuery(cmd);
        }

        // DELETE api/heroes/5
        [HttpDelete("{id}")]
        public async Task Delete(int id)
        {
            var cmd = new SqlCommand(@"delete from hero where id = @id");
            cmd.Parameters.AddWithValue("id", id);
            await SqlCommand.ExecuteNonQuery(cmd);
        }
    }
}
