import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const employeeData = [
    { id: "EMP-001", name: "Rajesh Patil", designation: "Foundry Manager" },
    { id: "EMP-002", name: "Amit Sharma", designation: "Production Supervisor" },
    { id: "EMP-003", name: "Suresh Yadav", designation: "Furnace Operator" },
    { id: "EMP-004", name: "Mahesh Pawar", designation: "Ladle Operator" },
    { id: "EMP-005", name: "Ramesh Gupta", designation: "Moulding Operator" },
    { id: "EMP-006", name: "Sunil Jadhav", designation: "Core Making Operator" },
    { id: "EMP-007", name: "Vijay Singh", designation: "Sand Plant Operator" },
    { id: "EMP-008", name: "Prakash More", designation: "Pattern Maker" },
    { id: "EMP-009", name: "Anil Verma", designation: "Pouring Operator" },
    { id: "EMP-010", name: "Deepak Kumar", designation: "Shakeout Operator" },
    { id: "EMP-011", name: "Santosh Kale", designation: "Fettling Operator" },
    { id: "EMP-012", name: "Ganesh Shinde", designation: "Shot Blasting Operator" },
    { id: "EMP-013", name: "Rohit Patil", designation: "CNC Operator" },
    { id: "EMP-014", name: "Kiran Deshmukh", designation: "VMC Operator" },
    { id: "EMP-015", name: "Ajay Tiwari", designation: "Drilling Machine Operator" },
    { id: "EMP-016", name: "Manoj Mishra", designation: "Milling Machine Operator" },
    { id: "EMP-017", name: "Nitin Kulkarni", designation: "Heat Treatment Operator" },
    { id: "EMP-018", name: "Pooja Joshi", designation: "Quality Inspector (QC)" },
    { id: "EMP-019", name: "Imran Sheikh", designation: "NDT Technician" },
    { id: "EMP-020", name: "Rakesh Yadav", designation: "Maintenance Technician" },
    { id: "EMP-021", name: "Sanjay Gupta", designation: "Electrician" },
    { id: "EMP-022", name: "Ravi More", designation: "Helper / Labour" },
    { id: "EMP-023", name: "Sneha Patil", designation: "Store Manager" },
    { id: "EMP-024", name: "Kavita Sharma", designation: "Purchase Executive" },
    { id: "EMP-025", name: "Rahul Jain", designation: "Dispatch Coordinator" }
];

function getDepartment(designation) {
    const d = designation.toLowerCase();
    if (d.includes('manager') || d.includes('supervisor')) return 'Management';
    if (d.includes('operator') || d.includes('helper') || d.includes('labour') || d.includes('technician') || d.includes('electrician') || d.includes('maker')) return 'Production';
    if (d.includes('quality') || d.includes('qc') || d.includes('ndt')) return 'Quality';
    if (d.includes('store') || d.includes('purchase') || d.includes('dispatch')) return 'Inventory';
    return 'General';
}

async function seedEmployees() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'nobalcasting',
            port: parseInt(process.env.DB_PORT || '3306')
        });

        console.log('✓ Connected to database');

        // 1. Seed Designations
        const uniqueDesignations = [...new Set(employeeData.map(e => e.designation))];
        console.log(`Seeding ${uniqueDesignations.length} designations...`);
        
        for (const desigName of uniqueDesignations) {
            const desigId = `DESIG-${desigName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 10)}`;
            await connection.query(
                `INSERT INTO designation_master (designation_id, name, description) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                [desigId, desigName, `Auto-generated for ${desigName}`]
            );
        }

        // 2. Seed Employees
        console.log(`Seeding ${employeeData.length} employees...`);
        for (const emp of employeeData) {
            const names = emp.name.split(' ');
            const firstName = names[0];
            const lastName = names.slice(1).join(' ') || '';
            const email = `${emp.name.toLowerCase().replace(/\s+/g, '.')}@nobalcasting.com`;
            const department = getDepartment(emp.designation);

            await connection.query(
                `INSERT INTO employee_master 
                (employee_id, first_name, last_name, email, phone, date_of_birth, gender, department, designation, joining_date, salary, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                first_name = VALUES(first_name),
                last_name = VALUES(last_name),
                email = VALUES(email),
                department = VALUES(department),
                designation = VALUES(designation)`,
                [
                    emp.id, 
                    firstName, 
                    lastName, 
                    email, 
                    '9999999999', 
                    '1990-01-01', 
                    'male', 
                    department, 
                    emp.designation, 
                    '2024-01-01', 
                    25000, 
                    'active'
                ]
            );
        }

        console.log('✓ All employees and designations seeded successfully');

    } catch (error) {
        console.error('Error seeding HR data:', error);
    } finally {
        if (connection) await connection.end();
    }
}

seedEmployees();
