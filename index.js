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
    left join employee c on a.manager_id=c.ID
    order by a.last_name;
    `, function(err,data){
    if (err) throw err;
      res(data);
    })
});

const getDepartments =()=> new Promise((res,rej) =>{
    connection.query("select * from department", function(err,data){
        if(err) throw err;
        res(data);
    })
});

const getManagers = () => new Promise((res,rej) =>{
    connection.query(`
    select distinct
    b.ID,
    concat(b.last_name, ", ", b.first_name) as managerName
    from employee b
    inner join employee a on a.manager_id=b.id
    `, function(err,data){
        if (err) throw err;
        res(data);
    })
})

const getEmployeesByManager = (ID)=> new Promise((res,rej)=>{
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
    where a.manager_id =?
    order by a.last_name;
    `
    ,[ID],function(err,data){
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
    where b.title =?
    order by a.last_name;
    `
    ,[role],function(err,data){
    if (err) throw err;
      res(data);
    })
});

const getRoleBudget =(role) => new Promise((res,rej) =>{
    connection.query(`
    select
    sum(d.salary) as budget
    from role d
    left join employee e on d.ID=e.role_id
    where d.title=?;
    `,[role], function(err,data){
        if(err) throw err;
        res(data);
    })
})

const getDepartmentBudget =(department) => new Promise((res,rej) =>{
    connection.query(`
    select
    sum(f.salary) as budget
    from role f
    left join employee g on f.ID=g.role_id
    left join department h on h.ID=f.department_id
    where h.name=?;
    `,[department], function(err,data){
        if(err) throw err;
        res(data);
    })
})

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
    where d.name=?
    order by a.last_name;`
    ,[dep],function(err,data){
    if (err) throw err;
      res(data);
    })
});

async function newOperation(){
    let choice= await inquirer.prompt({
        name: "selection",
        message: "What would you like to do? ",
        choices:["View employees","View employees by department","View employees by role","View employees by manager","Add employee", "Add department", "Add role", "Update role","Update employee","Exit"],
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
                        getDepartmentBudget(resp.roleSearch).then((budget) =>{
                            console.log("The total budget for the "+ resp.roleSearch +" department is $" +budget[0].budget +"\n\n");
                            newOperation();
                        });
                });  
            });
        });
            break;
        case "View employees by manager":
            const managerList= await getManagers();
            //map list of names
            const managerNames = managerList.map(item => item.managerName)
            inquirer.prompt({
                name: "managerSelect",
                message: "Select Manager",
                choices: managerNames,
                type: "list"
            }).then(function(resp){
                let managerID= managerList.filter(item => item.managerName===resp.managerSelect)[0].ID;
                getEmployeesByManager(managerID).then((data)=>{
                    console.table(data);
                    newOperation();
                })
            })
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
                    getRoleBudget(resp.roleSearch).then((budget) =>{
                        console.log("The total budget for the "+ resp.roleSearch +" role is $" +budget[0].budget +"\n\n");
                        newOperation();
                    })
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
        case "Remove employee":
            const employees =await getEmployees();
            //map list of employees into list of first and last names
            const employeeList=employees.map(item => `${item.last_name}, ${item.first_name}`)
            inquirer.prompt({
                name: "selection",
                message: "Select employee to remove",
                choices: employeeList,
                type: "list"
            }).then(function(resp){
                remove_id = employees.filter(item => item.last_name === resp.selection.split(", ")[0] && item.first_name === resp.selection.split(", ")[1])[0].ID;
                connection.query("DELETE FROM employee WHERE ?",{id:remove_id}, function(err){
                    if (err) throw err;
                    console.log(resp.selection + " removed from employees.");
                    newOperation();
                })
                
            })
            break;  
        case "Update role":
            //query list of roles
            connection.query("SELECT * from role", async function(err,data){
                if(err) throw err;
                const titles=data.map(item => item.title);
                //get data from departments table
                const departments=await getDepartments();
                //map list of department names
                const depList=departments.map(item => item.name);
                inquirer.prompt([{
                    name: "roleName",
                    message: "Select role to modify",
                    choices: titles,
                    type: "list"
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
                },
                {
                    name: "newDepartment",
                    message: "Select department",
                    choices: depList,
                    type: "list"
                }
            ]).then(function(resp){
                // search for ID for selected role
                const role_id = data.filter(item => item.title===resp.roleName)[0].ID;
                // search for ID of selected department
                const dep_id= departments.filter(item => item.name===resp.newDepartment)[0].ID;
                connection.query("UPDATE role SET ? where ?",[
                    {
                        salary: resp.salary,
                        department_id: dep_id
                    },
                    {
                        ID: role_id
                    }
                ])
                newOperation();
            })

            });
            break;
        case "Update employee":
            //query roles table for list of titles
            connection.query("SELECT * FROM role", async function(err,data){
                if (err) throw err;
                //map titles from role table into array
                const titles =data.map(item => item.title);
                //call promise function getEmployees
                const employees =await getEmployees();
                //map list of employees into list of first and last names
                const employeeList=employees.map(item => `${item.last_name}, ${item.first_name}`)
                //manager list should be same as employee list except with option for none.
                const managerList=employeeList
                managerList.push("none");
                inquirer.prompt([{
                name: "emp_name",
                message: "Select employee: ",
                choices: employeeList,
                type: "list"
            },
            {
                name: "role_title",
                message: "New role: ",
                choices: titles,
                type: "list"
            },
            {
                name: "manager_name",
                message: "New manager: ",
                choices: managerList,
                type: "list"
            }
        ]
            ).then(function(resp){
                // search for ID for selected role
                const role_id = data.filter(item => item.title===resp.role_title)[0].ID;
                //get ID of selected employee
                emp_id=employees.filter(item => item.last_name === resp.emp_name.split(", ")[0] && item.first_name === resp.emp_name.split(", ")[1])[0].ID;
                //make value null if no manager selected
                let manager_id=null;
                if(resp.manager_name!=="none"){
                manager_id = employees.filter(item => item.last_name === resp.manager_name.split(", ")[0] && item.first_name === resp.manager_name.split(", ")[1])[0].ID;
                }
                connection.query("UPDATE employee SET ? where ?",
               [{
                    role_id: role_id,
                    manager_id: manager_id
                },
                {
                    ID:emp_id
                } 
                ]
                )
                newOperation();
            });
        });
            break;   
        case "Exit":
            connection.end();
    }

}