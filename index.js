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
    connection.query(`
    select 
    a.ID,
    a.first_name,
    a.last_name,
    b.title,
    b.salary,
    concat(c.first_name , " " , c.last_name) as manager
    from employee a
    left join role b on a.role_id=b.ID
    left join employee c on a.manager_id=c.ID;
    `, function(err,data){
    if (err) throw err;
      res(data);
    })
});

const getEmployeesByRole = (role)=> new Promise((res,rej)=>{
    connection.query(`
    select 
    a.ID,
    a.first_name,
    a.last_name,
    b.title,
    b.salary,
    concat(c.first_name , " " , c.last_name) as manager
    from employee a
    left join role b on a.role_id=b.ID
    left join employee c on a.manager_id=c.ID
    where b.title =?`
    ,[role],function(err,data){
    if (err) throw err;
      res(data);
    })
});

const getEmployeesByDepartment = (dep)=> new Promise((res,rej)=>{
    connection.query(`
    select 
    a.ID,
    a.first_name,
    a.last_name,
    b.title,
    b.salary,
    concat(c.first_name , " " , c.last_name) as manager
    from employee a
    left join role b on a.role_id=b.ID
    left join employee c on a.manager_id=c.ID
    left join department d on b.department_id=d.ID
    where d.name=?;`
    ,[dep],function(err,data){
    if (err) throw err;
      res(data);
    })
});

async function newOperation(){
    let choice= await inquirer.prompt({
        name: "selection",
        message: "What would you like to do? ",
        choices:["View employees","View employees by department","View employees by role","Add employee", "Add department", "Add role", "Update Role","Remove Employee","Exit"],
        type:"list"
    })
    switch (choice.selection) {
        case "View employees":
            getEmployees().then((data)=>{
                console.table(data);
                newOperation();
            });
            break;
        case "View employees by department":
            //query roles table for list of titles
            connection.query("SELECT * FROM department", async function(err,data){
                //map titles from role table into array
                const titles =data.map(item => item.name);
                //ask for role to search for
                inquirer.prompt({
                    name:"roleSearch",
                    message:"Choose role: ",
                    choices:titles,
                    type: "list"
                }).then(function(resp){
                    getEmployeesByDepartment(resp.roleSearch).then((data)=>{
                        console.table(data);
                        newOperation();
                    });
                })
            
                
            });
            break;
        case "View employees by role":
            //query roles table for list of titles
            connection.query("SELECT * FROM role", async function(err,data){
            //map titles from role table into array
            const titles =data.map(item => item.title);
            //ask for role to search for
            inquirer.prompt({
                name:"roleSearch",
                message:"Choose role: ",
                choices:titles,
                type: "list"
            }).then(function(resp){
                getEmployeesByRole(resp.roleSearch).then((data)=>{
                    console.table(data);
                    newOperation();
                });
            })
        
            
        });
            break;
        case "Add employee":
            //query roles table for list of titles
            connection.query("SELECT * FROM role", async function(err,data){
                if (err) throw err;
                //map titles from role table into array
                const titles =data.map(item => item.title);
                //call promise function getEmployees
                const employees =await getEmployees();
                //map list of employees into list of first and last names
                const employeeList=employees.map(item => `${item.last_name}, ${item.first_name}`)
                //add option for no manager
                employeeList.push("none");
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
                //search for ID for selected role
                const role_id = data.filter(item => item.title===resp.role_title)[0].ID;
                //make value null if no manager selected
                let manager_id=null;
                if(resp.manager_name!=="none"){
                manager_id = employees.filter(item => item.last_name === resp.manager_name.split(", ")[0] && item.first_name === resp.manager_name.split(", ")[1])[0].ID;
                }
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
            let newDepartment= await inquirer.prompt({
                name:"departmentName",
                message:"Name of department",
                type: "input",
                //validate that user did not enter a blank because name does not allow nulls. 
                validate: function (value){
                    if(value !==""){
                        return true;
                    }
                    return "Please enter a department name";
                }
            })
            console.log(newDepartment.departmentName);
            connection.query("INSERT INTO department SET ?",{name: newDepartment.departmentName}, function(err,data){
                if(err) throw err;
            })
            newOperation();
            break;
        case "Add role":
            //query list of departments
            connection.query("SELECT * FROM department", async function(err,data){
                if(err) throw err;
                //map list of departments
                const departments = data.map(item => item.name)
                let newRole= await inquirer.prompt([{
                    name: "departmentSelect",
                    message: "Select a department: ",
                    choices: departments,
                    type: "list"
                },
                {
                    name: "roleName",
                    message: "Name of role",
                    type: "input"
                },
                {
                    name: "salary",
                    message: "Enter salary for role: ",
                    type: "input",
                    validate: function (value){
                        if(isNaN(value)){
                            return "Please enter a number."
                        }
                        else{
                            return true;
                        }
                    }
                }
            ]);
            //get id of department that matches name
            department_id=data.filter(item => item.name === newRole.departmentSelect)[0].ID;
            // console.log(newRole.departmentSelect);
            connection.query("INSERT INTO role SET ?",{
                title: newRole.roleName,
                salary: newRole.salary,
                department_id: department_id
            })
            newOperation();
            });
            
            break;        
        case "Exit":
            connection.end();
    }

}