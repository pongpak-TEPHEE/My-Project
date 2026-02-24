import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

// ท่าไม้ตายสร้างตัวแปรหาตำแหน่งไฟล์ปัจจุบัน (เพราะเราใช้ ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KUSRC Science Room Booking API',
      version: '1.0.0',
      description: 'คู่มือ API สำหรับระบบจองห้องคณะวิทยาศาสตร์ ศรีราชา',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
    // เพิ่มปุ่มใส่ token
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };