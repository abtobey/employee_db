var mysql = require("mysql");
var inquirer = require("inquirer");

var connection = mysql.createConnection({
  host: "localhost",

  // Your port; if not 3306
  port: 3306,

  // Your username
  user: "root",

  // Your password
  password: "",
  database: "employees"
});

connection.connect(function(err) {
    if (err) throw err;
    newOperation();
    
  });

const getEmployees = ()=> new Promise((res,rej)=>{
    connection.query("SELECT * FROM employee", function(err,data){
    if (err) throw err;
      res(data);
    })
});

async function newOperation(){
    let choice= await inquirer.prompt({
        name: "selection",
        message: "What would you like to do? ",
        choices:["View employees","Add employee", "Add department", "Add role", "Update Role","Exit"],
        type:"list"
    })
    switch (choice.selection) {
        case "View employees":
            getEmployees().then((data)=>{
                console.table(data);
                newOperation();
            });
            break;
        case "Add employee":
            //query roles table for list of titles
            connection.query("SELECT * FROM role", async function(err,data){
                if (err) throw err;
                const titles =data.map(item => item.title);
                const employees =await getEmployees();
                const employeeList=employees.map(item => `${item.last_name}, ${item.first_name}`)
                employeeList.push("null");
                inquirer.prompt([{
                name: "first_name",
                message: "First name: ",
                type: "input"
            },
            {
                name: "last_name",
                message: "Last name: ",
                type: "input"
            },
            {
                name: "role_title",
                message: "Role: ",
                choices: titles,
                type: "list"
            },
            {
                name: "manager_name",
                message: "Manager: ",
                choices: employeeList,
                type: "list"
            }
        ]
            ).then(function(resp){
                const role_id = data.filter(item => item.title===resp.role_title)[0].ID;
                const manager_id = employees.filter(item => item.last_name === resp.manager_name.split(", ")[0] && item.first_name === resp.manager_name.split(", ")[1])[0].ID;
                console.log(manager_id);
                connection.query("INSERT INTO employee SET ?",
                {
                    first_name: resp.first_name,
                    last_name: resp.last_name,
                    role_id: role_id,
                    manager_id: manager_id
                } 
                )
                newOperation();
            })
        })
            break;
        case "Add department":
            break;
        case "Add role":
            break;        
        case "Exit":
            connection.end();
    }

}