--
-- PostgreSQL database dump
--

\restrict 7dvsmTMxoGEShfSxghqNamtcIFge5G6BcnthXBXoTnfBK5yM88Efd6yzG66IDNv

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

-- Started on 2026-04-22 01:31:57

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 4963 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 16473)
-- Name: Booking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Booking" (
    booking_id character varying NOT NULL,
    room_id character varying NOT NULL,
    user_id character varying,
    purpose character varying,
    date date,
    start_time time without time zone,
    end_time time without time zone,
    status character varying,
    approved_by character varying,
    cancel_reason character varying,
    additional_notes character varying
);


ALTER TABLE public."Booking" OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 49328)
-- Name: BookingScope; Type: TABLE; Schema: public; Owner: project_app
--

CREATE TABLE public."BookingScope" (
    opening_mins time without time zone,
    closing_mins time without time zone,
    max_duration_hours integer,
    max_advance_days integer,
    date_create date NOT NULL,
    min_advance_hours integer
);


ALTER TABLE public."BookingScope" OWNER TO project_app;

--
-- TOC entry 220 (class 1259 OID 16448)
-- Name: Equipment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Equipment" (
    equipment_id character varying NOT NULL,
    room_id character varying NOT NULL,
    computer integer,
    microphone integer,
    type_of_computer character varying,
    whiteboard integer,
    projector integer
);


ALTER TABLE public."Equipment" OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16441)
-- Name: OTP; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OTP" (
    request_id character varying NOT NULL,
    email character varying,
    otp_code character varying,
    expired_at timestamp with time zone,
    created_at timestamp with time zone
);


ALTER TABLE public."OTP" OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16417)
-- Name: Rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Rooms" (
    room_id character varying NOT NULL,
    room_type character varying,
    capacity integer,
    location character varying,
    room_characteristics character varying,
    repair boolean,
    is_active boolean
);


ALTER TABLE public."Rooms" OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16424)
-- Name: Schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Schedules" (
    schedule_id character varying NOT NULL,
    room_id character varying NOT NULL,
    subject_name character varying,
    teacher_name character varying,
    start_time time without time zone,
    end_time time without time zone,
    date date,
    temporarily_closed boolean,
    user_id character varying,
    teacher_surname character varying,
    sec character varying,
    closed_reason character varying,
    course_code character varying
);


ALTER TABLE public."Schedules" OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 41136)
-- Name: Terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Terms" (
    id character varying NOT NULL,
    academic_year character varying,
    status character varying,
    term character varying,
    start_date date,
    end_date date
);


ALTER TABLE public."Terms" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 24588)
-- Name: TokenBlacklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TokenBlacklist" (
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public."TokenBlacklist" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16467)
-- Name: Users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Users" (
    user_id character varying(20) NOT NULL,
    title character varying(10),
    name character varying(50),
    surname character varying(50),
    role character varying(20),
    email character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_verified boolean,
    is_active boolean,
    session_id character varying(20)
);


ALTER TABLE public."Users" OWNER TO postgres;

--
-- TOC entry 4954 (class 0 OID 16473)
-- Dependencies: 222
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Booking" (booking_id, room_id, user_id, purpose, date, start_time, end_time, status, approved_by, cancel_reason, additional_notes) FROM stdin;
ce9731c2-623c-4d48-af53-20d60c3da524	26504	b6630200578	456	2026-04-12	08:30:00	09:00:00	rejected	b6630200578	5555	\N
d10b6aab-e4e8-4b30-8b25-3b57bdd423c6	26504	b6630200578	1234	2026-04-14	09:00:00	10:00:00	rejected	\N	456	\N
26748b83-c1f6-4b92-a969-52c76c4db071	26506	b6630200578	456	2026-04-15	10:30:00	11:00:00	rejected	\N	789	\N
a3b4a733-b15e-4202-8f87-ad22f86b2b17	26504	b6630200578	หหหห	2026-04-17	08:30:00	09:30:00	completed	b6630200578	\N	\N
e6c35c8d-3082-4143-b8d3-10425c5d25f0	26504	b6630200578	123	2026-04-16	10:00:00	11:00:00	cancelled	b6630200578	งดใช้ห้อง	\N
412cd49a-2b60-4352-809d-4f463e89cb4f	26504	b6630200578	75	2026-04-15	13:30:00	17:00:00	cancelled	\N	ระบบยกเลิกอัตโนมัติเนื่องจากไม่ได้รับการอนุมัติทันเวลาที่ขอใช้งาน	\N
ec990385-529b-4919-8c48-c582e1e125f1	26508	b6630200403	ต้องการบรรยายเรื่องโลกร้อน	2026-04-16	10:00:00	12:00:00	cancelled	\N	ระบบยกเลิกอัตโนมัติเนื่องจากไม่ได้รับการอนุมัติทันเวลาที่ขอใช้งาน	ขอไมค์เพิ่มจาก 1 แท่งเป็นสองแท่ง
bac66c8a-a3e6-431b-982f-9096dd1579ec	26504	b6630200403	นันทนาการ	2026-04-17	12:00:00	16:00:00	cancelled	\N	ระบบยกเลิกอัตโนมัติเนื่องจากไม่ได้รับการอนุมัติทันเวลาที่ขอใช้งาน	ขอเก้าอี้เพิ่มอีก 10 ตัว
8064920a-6655-4cbc-8020-b32e7207ecc8	13403	b6630200403	ต้องการอบรม นิสิตเพิ่มเติม	2026-04-19	10:30:00	12:00:00	cancelled	b6630200403	\N	ขอลำโพง
b9c0a2b3-9dda-47a1-ba67-e2db0ae4f296	26504	b6630200578	Test001	2026-04-21	08:00:00	09:00:00	cancelled	b6630200578	ยกเลิกอัตโนมัติเนื่องจากชนกับตารางเรียนวิชา Mobile Application Design and Development	\N
ffd3bfe9-1696-47f4-9c57-6de56267e085	26508	b6630200403	ddd	2026-04-12	12:00:00	14:00:00	completed	b6630200578	\N	\N
97915485-79d8-4adb-a430-9eaebb892bd0	150411	b6630200403	ชสอนเขียนโค้วิชา python	2026-04-12	08:00:00	10:00:00	completed	b6630200403	\N	\N
48d20787-83fa-4b15-a06f-1fb8407a8209	26506	b6630200403	ไปวายน้ำ	2026-04-14	14:00:00	16:00:00	cancelled	\N	\N	\N
7d20fa85-d2da-4480-a729-64d25dc5bfa9	26504	b6630200578	555	2026-04-22	08:00:00	09:00:00	approved	b6630200578	\N	\N
0258eb33-8339-4617-9795-4b983be6a656	26506	b6630200403	qqq	2026-04-13	09:30:00	12:00:00	completed	b6630200578	\N	\N
b7d76a62-6539-49ac-8287-e0da4ef5011b	26506	b6630200578	456	2026-04-13	17:30:00	18:00:00	completed	b6630200578	\N	\N
e7d952cc-9a2b-4148-846a-cb6d82b1367d	26506	b6630200578	555	2026-04-13	19:00:00	20:00:00	completed	b6630200578	\N	\N
c7743351-7a1d-4597-8c84-5767146403fe	26506	b6630200578	ดดดดด	2026-04-15	08:30:00	09:00:00	completed	b6630200578	\N	\N
15a49cda-fc12-469b-999b-78cdb69811ea	26506	b6630200578	Test001	2026-04-15	14:30:00	15:30:00	completed	b6630200578	\N	\N
fe7698a8-73db-4a5c-99ad-0dbb71f6e163	26506	b6630200578	Test002	2026-04-15	17:00:00	18:00:00	completed	b6630200578	\N	\N
423b0dc8-876f-4226-8dbd-39227a5d179e	26506	b6630200578	Despacito	2026-04-16	08:30:00	09:30:00	completed	b6630200578	\N	5555
813a1e49-9964-4b0c-baa1-c1a4892dbff0	26506	b6630200403	ทำงานเอกสาร	2026-04-16	11:00:00	15:00:00	completed	b6630200403	\N	ต้องการขอ ไมค์เพิ่มเติม
5b99baec-12ae-44aa-ac63-f25c380e242c	26508	b6630200403	สอนชดเชยรายวิชา NLP สำหรับนักศึกษา ปี 4	2026-04-23	10:30:00	15:00:00	cancelled	b6630200578	ไม่สบาย	ต้องการขอปากกาไวท์บอร์ดเพิ่ม 4 ชิ้น
2fbc5772-fe53-4303-8426-fc7121b865e9	26506	b6630200403	ต้องการใช้เพื่อสอนพิเศษ	2026-04-18	15:00:00	18:00:00	completed	b6630200578	\N	ต้องการไมค์
c17b9a62-fd5b-4231-bc9a-56b2af8edcc2	26512	b6630200578	Test001	2026-04-21	08:00:00	09:00:00	completed	b6630200578	\N	\N
2b36fb34-4d97-4213-8d38-e49b8cd54c58	26506	b6630200578	Test001	2026-04-21	08:00:00	09:00:00	completed	b6630200578	\N	\N
efc7231f-1132-4217-bbbf-a9498db01c24	26508	b6630200578	Test001	2026-04-21	08:00:00	09:00:00	completed	b6630200578	\N	\N
\.


--
-- TOC entry 4957 (class 0 OID 49328)
-- Dependencies: 225
-- Data for Name: BookingScope; Type: TABLE DATA; Schema: public; Owner: project_app
--

COPY public."BookingScope" (opening_mins, closing_mins, max_duration_hours, max_advance_days, date_create, min_advance_hours) FROM stdin;
08:00:00	20:00:00	12	10	2026-04-18	24
\.


--
-- TOC entry 4952 (class 0 OID 16448)
-- Dependencies: 220
-- Data for Name: Equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Equipment" (equipment_id, room_id, computer, microphone, type_of_computer, whiteboard, projector) FROM stdin;
eq-26506	26506	50	2	VDI	1	1
eq-26508	26508	50	1	VDI	1	1
eq-26512	26512	50	2	VDI	1	1
eq-231213	231213	1	1	-	1	1
eq-150413	150413	50	1	PC	1	1
eq-150414	150414	50	1	PC	1	1
eq-150415	150415	50	1	PC	1	1
eq-SeniorProject	SeniorProject	0	0	PC	0	5
eq-555	555	0	0	PC	0	0
eq-5555	5555	6	6	VDI	6	6
eq-456	456	0	0	-	0	0
eq-26504	26504	0	0	-	0	0
eq-150416	150416	0	0	-	0	0
eq-13403	13403	50	3	-	1	2
eq-150411	150411	0	0	-	0	0
eq-1404	1404	0	0	-	0	0
\.


--
-- TOC entry 4951 (class 0 OID 16441)
-- Dependencies: 219
-- Data for Name: OTP; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OTP" (request_id, email, otp_code, expired_at, created_at) FROM stdin;
\.


--
-- TOC entry 4949 (class 0 OID 16417)
-- Dependencies: 217
-- Data for Name: Rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Rooms" (room_id, room_type, capacity, location, room_characteristics, repair, is_active) FROM stdin;
231213	123dsf	3	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	fsdfss	f	f
26504	Computer lab	45	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
13403	ห้องบรรยาย	50	อาคารที่ 1	ใช้สำหรับการเรียนการสอน 	f	f
150416	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150411	Computer lab	45	อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
SeniorProject	Computer lab	45	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	f
1404	fff	0	อาคาร 2		t	t
555	555	5555	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	5555	t	f
150413	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
26506	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
26508	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
26512	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
5555	666	66	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	666	t	f
456		0	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา		t	f
150414	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150415	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
\.


--
-- TOC entry 4950 (class 0 OID 16424)
-- Dependencies: 218
-- Data for Name: Schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Schedules" (schedule_id, room_id, subject_name, teacher_name, start_time, end_time, date, temporarily_closed, user_id, teacher_surname, sec, closed_reason, course_code) FROM stdin;
\.


--
-- TOC entry 4956 (class 0 OID 41136)
-- Dependencies: 224
-- Data for Name: Terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Terms" (id, academic_year, status, term, start_date, end_date) FROM stdin;
d4c7ff06-20da-45c1-bf39-da019f6bc885	2025	active	first	2025-06-24	2025-10-30
6f04a004-de96-40ea-92f3-49524d68b902	2025	active	end	2025-11-09	2026-03-30
870aeb03-481a-4b4e-a7a5-bebf14279559	2025	active	summer	2026-04-20	2026-05-25
\.


--
-- TOC entry 4955 (class 0 OID 24588)
-- Dependencies: 223
-- Data for Name: TokenBlacklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TokenBlacklist" (token, expires_at) FROM stdin;
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJpYXQiOjE3NzAzODc3NzEsImV4cCI6MTc3MDQ3NDE3MX0.rbZ5cV8N_IGSB8wXjSmJOMmDdJr-Ep7q_BtojlbdmUY	2026-02-07 21:22:51
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjNiZmI5Yjc2NmJiZjkxZTM3NjA3IiwiaWF0IjoxNzc1ODA5Mzk5LCJleHAiOjE3NzU4MTExOTl9.KYcQx2fvy9rSxBMxfXUvBPrRllQE9OD1jqr14-xXztY	2026-04-10 15:53:19
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6Ijg1YzVhZTE2MjM3OTJkNTUwYzZkIiwiaWF0IjoxNzc1ODE1NzY0LCJleHAiOjE3NzU4MTc1NjR9.xC-Jj1dFUzWJxTHuQqUMVov7B60LqS_RK2eff0GRA1g	2026-04-10 17:39:24
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiJlMTZjNDNlYmQ2ZjVhYjgwYWQ5ZiIsImlhdCI6MTc3NTg0MDI2MiwiZXhwIjoxNzc1ODQyMDYyfQ.6grhjLSKpwkIeVRhJHsPaGQquIJHZhkMoc9CF_l0kMU	2026-04-11 00:27:42
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6ImI2MDkzMzhhZjUwNzkxMzM1MjQ1IiwiaWF0IjoxNzc1ODg2NzgzLCJleHAiOjE3NzU4ODg1ODN9.evAwRRjgG0Yy1oksnE_SgF0e1W4LjO8GUwAj2DIVeVI	2026-04-11 13:23:03
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiI5NWY5Y2M5YjAxNDc4YTQxZTc4ZCIsImlhdCI6MTc3NTg4OTA2MCwiZXhwIjoxNzc1ODkwODYwfQ._sK4IGUjnc1oG5hsjmZ8pqnIF4jWvHJzph7WcwFkmjw	2026-04-11 14:01:00
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjNkZjliODgzMDdjMzZmMmZjNWRlIiwiaWF0IjoxNzc1ODg5MTAxLCJleHAiOjE3NzU4OTA5MDF9.TQAinSRwp1NpftnGvjrDasVFAJQnKSZFOkuk_Lq2ENs	2026-04-11 14:01:41
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiNzY0OGM4YWZmODk5YzQwMDgxMzEiLCJpYXQiOjE3NzU4OTAyNzcsImV4cCI6MTc3NTg5MjA3N30.xtT4vw5UCsLBt1UFUUc50RxLnCKPgbE1NXQnWga1kXs	2026-04-11 14:21:17
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiI2MzYzYzE2ODNjZWRhYzFiMTMwMCIsImlhdCI6MTc3NTg5MTIzMywiZXhwIjoxNzc1ODkzMDMzfQ.NZ2iGwFJruHLt_bT15r3B6_ns9kO0U6T0-OJSb5X_7Y	2026-04-11 14:37:13
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiIyMjVkZDRjZDczMjBjODQwNTkyNyIsImlhdCI6MTc3NTg5NTgzOCwiZXhwIjoxNzc1ODk3NjM4fQ.PfLNe2YpaEKw-9JartJpSlFdjJabiaPa2D8MTOg91I0	2026-04-11 15:53:58
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiIyNTM0NmM2Njc2NGUyNDM0NmVmYyIsImlhdCI6MTc3NTg5NjYzMCwiZXhwIjoxNzc1ODk4NDMwfQ.D4sbG93OnnMIQ8dw4S4H4TQk9k6C2m_sfzAzXxoh6Mw	2026-04-11 16:07:10
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiMWNiNmZmNDRkYTE4MjRmNjAxYTYiLCJpYXQiOjE3NzU4OTkxNTUsImV4cCI6MTc3NTkwMDk1NX0.aVkqESMGn6EL81uQPKx9Js3VwQbRc-Op20O4ar-NDQ4	2026-04-11 16:49:15
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiI3YzgyM2VlY2JjNmIwMTkzMzA2MSIsImlhdCI6MTc3NTg5OTk1NywiZXhwIjoxNzc1OTAxNzU3fQ.jIxe7m_53juN9ZwOy7QA5AgclzJUgOV9EA9-korBZ0s	2026-04-11 17:02:37
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiNzNjOWU2ZTQ4MmVkN2FkNDE1MWIiLCJpYXQiOjE3NzU5MDIyOTUsImV4cCI6MTc3NTkwNDA5NX0.amfaPRwo4yEMV_Yet5JOLby0JZDanGgiIzldoA8IVH0	2026-04-11 17:41:35
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiJhNzBlMGJjNDRhN2M4ZmI1OGQ1ZSIsImlhdCI6MTc3NTkwMzUxNSwiZXhwIjoxNzc1OTA1MzE1fQ.D-nzhZbe20CKhRPh6lIXET42NmBjhwpzxJVyCH6wctU	2026-04-11 18:01:55
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiZGMyMmQxZTRmNDZiODk1YzZjODUiLCJpYXQiOjE3NzU5MTU3MDEsImV4cCI6MTc3NTkxNzUwMX0.GcifRlBC-sbvYVRlNRY1-SWzKTG79GxEV4x7xm8p16s	2026-04-11 21:25:01
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiJlMTJhNDAwNGU5ZWQyMzU0MGZiOCIsImlhdCI6MTc3NTkzMjM2MSwiZXhwIjoxNzc1OTM0MTYxfQ.sezDzReeKhJqrWBVqb1W4l_f603SSFeM-nWppCdV2XU	2026-04-12 02:02:41
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiIwMmNhNmJjMjkzY2U0MjZhYzI1NiIsImlhdCI6MTc3NTk2Njk0OCwiZXhwIjoxNzc1OTY4NzQ4fQ.ml03zNRvhrgqJvdbDgJ-Xh-BpEvwVyyPN35DYpOXeIk	2026-04-12 11:39:08
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiMGVkODBiNjcwMjEwYTc0MzU5NzAiLCJpYXQiOjE3NzU5NzQ5NTksImV4cCI6MTc3NTk3Njc1OX0.781_qNrnMkrp88zxC5T_JtVTN2VOXwZgSUHQxqCDrQE	2026-04-12 13:52:39
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiZjNjNzE2ZGY0ZGMxNzRmMjA1ZGMiLCJpYXQiOjE3NzU5NzU1MDYsImV4cCI6MTc3NTk3NzMwNn0.1SMsEK339ox9qzzIdJUMauCHLEqBiTTLGyZXiW8XLTE	2026-04-12 14:01:46
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiJiZGE0YmFiYjI2MjVkMjNmNDE0OSIsImlhdCI6MTc3NTk3Njc5MiwiZXhwIjoxNzc1OTc4NTkyfQ.dd8wA1fyqcm5i8KLHF0XTMpUv-kmTC4zI8bgWGRV9Ks	2026-04-12 14:23:12
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiJiNzJlZDg0ZDUyZjRhNWJjNTViYyIsImlhdCI6MTc3NTk4MTA1NywiZXhwIjoxNzc1OTgyODU3fQ._PZDXsEkmRNGqpGeigBcM2cLWWn3skz1Znm1QGWsTSI	2026-04-12 15:34:17
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiI0ZmU2NTFhNWM4OTJkOTYxZGQyOCIsImlhdCI6MTc3NTk4MjExNiwiZXhwIjoxNzc1OTgzOTE2fQ.yS7U3LFzGZY8qUeakBSdHo7UyF7EwrykcziOSZfy5rY	2026-04-12 15:51:56
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjAzYmFhZjhjYjA2ZWJlMDE2ZWNhIiwiaWF0IjoxNzc1OTgzMzk3LCJleHAiOjE3NzU5ODUxOTd9.urLeDTwcqJrUpGK1tIpjjKwdx2EnSdlFUU3l_J4OTFE	2026-04-12 16:13:17
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6ImU3NGUxMTVmZWUxNDI0ODZhMmM2IiwiaWF0IjoxNzc1OTg1MTAwLCJleHAiOjE3NzU5ODY5MDB9.STbwf1ZL903T4CWQN5rvYXw4Osq8vN-3eE-duiIRBYE	2026-04-12 16:41:40
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiI5MGQ0YjYwMWE1OTE4Njg5ZDhjOCIsImlhdCI6MTc3NjAwMjEyNCwiZXhwIjoxNzc2MDEyOTI0fQ.i8_10CBa-kNDFx1RYamwarrPaBeKdwdHvvxee7C8P_Q	2026-04-12 23:55:24
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiMWVhZjIxMmYwNWIxOTY4N2Y5YmIiLCJpYXQiOjE3NzYwMDIxNDUsImV4cCI6MTc3NjAxMjk0NX0.lK5NevnCXlH278J8xdRsIa5U68-fCwr78SRpw4aqUaA	2026-04-12 23:55:45
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiMWQ4OTk1N2I1M2QxY2EwNjk4ZDYiLCJpYXQiOjE3NzYwMDI5NDEsImV4cCI6MTc3NjAxMzc0MX0.Cmur2qkfgbC6GelIqVOby3WX6Z-HWe9CTbKtO5ot5i4	2026-04-13 00:09:01
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6ImFmMWFkOGNkYzVkMmZjNDcwYWUxIiwiaWF0IjoxNzc2MDAyNjMwLCJleHAiOjE3NzYwMTM0MzB9.TDCTTTCT7XXRwGWQdXYXePBPhjpNCZTGvivaJBXdpDo	2026-04-13 00:03:50
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiI0ZWM0MjE1NDdlZDk4OWQ0YzU2YiIsImlhdCI6MTc3NjAwNTc2OCwiZXhwIjoxNzc2MDE2NTY4fQ.FfqgTDYeok8R3jnGm0CQnOcttkmCle9kystavPKsDpg	2026-04-13 00:56:08
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6ImFkMGNiZWVkNTIzMTkxMWY5OGU5IiwiaWF0IjoxNzc2MDA2NzE5LCJleHAiOjE3NzYwMTc1MTl9.rCHssVT4jAWS6eTOP95mAEIea2Q39ywkMN2_oEAOfTI	2026-04-13 01:11:59
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiNjgzMjI4MmVkNGQ2YjNjYmJjM2YiLCJpYXQiOjE3NzYwMDMyODIsImV4cCI6MTc3NjAxNDA4Mn0.6uoKPWq807_YVNUlpFtFE0v-8R41iKPeekAvmWvLe38	2026-04-13 00:14:42
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiMTMyODk0OGQwZjRjYTUwMmZkYjMiLCJpYXQiOjE3NzYwMTEyMjgsImV4cCI6MTc3NjAxMTI4OH0.sUmVuG9Zlse1oltlicuCqB5K_D-BanCOlS8ozAvDpNQ	2026-04-12 23:28:08
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiJhOWI2Yjc5MWRlMDQ0YzI3ZDMzOCIsImlhdCI6MTc3NjA2NjA3NiwiZXhwIjoxNzc2MDY3ODc2fQ.0KJ9klTMjX_8w2wb6BjALjl_M8UT2iNrBzmb2hw1rPE	2026-04-13 15:11:16
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiIwMzhkZDg2NzM3ZjM1ZjM0N2IzMiIsImlhdCI6MTc3NjA2NjIwNSwiZXhwIjoxNzc2MDY4MDA1fQ.FkpOh_XSjuV4t-81oyBlZ1BcFCH4JCdatU5AtDFQDMM	2026-04-13 15:13:25
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiI5YzMxMTM2NmFiNjJjMmQ0N2RlMSIsImlhdCI6MTc3NjA2NjM1MiwiZXhwIjoxNzc2MDY4MTUyfQ.k544z4gF067gazq_KyJebiq9llOPCTZ2e_gvCHGdC_Y	2026-04-13 15:15:52
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiI3M2YyOGE1MTEwMjRlOTM4N2JkMyIsImlhdCI6MTc3NjA2NjQ5OCwiZXhwIjoxNzc2MDY4Mjk4fQ.ZfbppZsPNKMygAtOpUXwoo3JM1VxXXbUgO7tDpvZURY	2026-04-13 15:18:18
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiJkZjUyNzA5ZTIwZjMwMGRiZTA0OSIsImlhdCI6MTc3NjA2Njk5MSwiZXhwIjoxNzc2MDY4NzkxfQ.aQowUMstQetmiynV_g2mWEcioO-vKmQVkn4x_cJeY60	2026-04-13 15:26:31
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiJiZTRhNTgxZmM4NjVhMmE3NjBmYyIsImlhdCI6MTc3NjA2NzA4NSwiZXhwIjoxNzc2MDY4ODg1fQ.EqnLgAl-YSk2QbqtVJ2g-zIfMe9ZUm3-qsuVncui4_g	2026-04-13 15:28:05
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiIyMDIyZThkNDYzZmRiMjdmN2JiMSIsImlhdCI6MTc3NjA2ODM4MSwiZXhwIjoxNzc2MDcwMTgxfQ.F_6et9QZgFw4NOwi3-4kTzED4eyCsQNjLKvQOb1MU8s	2026-04-13 15:49:41
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiI1MDg4M2JkYzM3ZTkxN2VlZDgzNyIsImlhdCI6MTc3NjA3MDI4NSwiZXhwIjoxNzc2MDcyMDg1fQ.3FXq4nE9DiXrhJqCh-CP2Po49pPA2lqoxRFJzMC1k9c	2026-04-13 16:21:25
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiIzOTkzMDQ3ODA5MDc0NjgzZmVhMyIsImlhdCI6MTc3NjA3MDYzNiwiZXhwIjoxNzc2MDcyNDM2fQ.k73CanhWRE3aJ0V37JHQTEntc4wIDswOKB_SCA6xiKg	2026-04-13 16:27:16
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiIwZWUxNTQ1MGFjMmY2NmZhM2M4ZSIsImlhdCI6MTc3NjA3NTk3MCwiZXhwIjoxNzc2MDc2MDMwfQ.hyPIopcbnfue8rAbb4PqiliM4BiEdo--V0EmhtL2fM8	2026-04-13 17:27:10
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiNGVmZDllNDQ1ZWI2M2M2NDMzMTYiLCJpYXQiOjE3NzYwNzYwMjMsImV4cCI6MTc3NjA3NjA4M30.qNWUjtJCHhpei1elYhfkLERtKSQy5vXZiXpCziP8kRo	2026-04-13 17:28:03
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiJkNDkwZDM5MDhkZDQ0Mzk4ZDExNyIsImlhdCI6MTc3NjA4ODU0OSwiZXhwIjoxNzc2MDkwMzQ5fQ.YkBaYaM67_W1N9NQoYpiOVHgxa-3NYTEaE09GfhgbZk	2026-04-13 21:25:49
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjBmMjlhMGI4MjVmNmRjNWZmNzE5IiwiaWF0IjoxNzc2MTU0OTA0LCJleHAiOjE3NzYxNTY3MDR9.Fl7DDiVOA6Yctv0xBg4INCjhuK_YYDAD4mpEi-_5EX0	2026-04-14 15:51:44
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiYmY3MjliNTdiNDE3MjdmZmZjZjkiLCJpYXQiOjE3NzYxNTgxMzgsImV4cCI6MTc3NjE1OTkzOH0.oo6Gz8PRNEV_CZRT2Ur_QQGIASBa8QsKfAKvdbK5vfw	2026-04-14 16:45:38
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiZmU5OWZmZjY3MTcxZjhmZDJiODkiLCJpYXQiOjE3NzYxNTk1NjIsImV4cCI6MTc3NjE2MTM2Mn0.uZJfE7McltkGZ0JQxzGQ9SX6pPz2SBNf8vfMY4LtRTs	2026-04-14 17:09:22
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiJlZGRiZThlMzYzYjQ3N2Y4NDA1OCIsImlhdCI6MTc3NjE4MDA3OCwiZXhwIjoxNzc2MTgxODc4fQ.Mr3HqdjPzyBQT_4r7f39UsuumAJPBm1darYU4YwG6VY	2026-04-14 22:51:18
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjBiYmRhMTc5YjY5NjVlZWRmMDNhIiwiaWF0IjoxNzc2MjMzNDY5LCJleHAiOjE3NzYyMzUyNjl9.6FLUeFgCksKrIPltpOCiuiJOaUSGQ4a5d85oXQ_wk1g	2026-04-15 13:41:09
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiODVlNWZlZjI0M2MyOGYwZWVmM2IiLCJpYXQiOjE3NzYyMzY0NTMsImV4cCI6MTc3NjIzODI1M30.-y-Kzsx18utLALONrv6yuSrZH-k-IHTPB7zGIwyut3Y	2026-04-15 14:30:53
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiNzM5OTEyNjA4NTgzMGQ5MTJjNmQiLCJpYXQiOjE3NzYyMzcyMjcsImV4cCI6MTc3NjIzOTAyN30.1Oxy2jTD0lccuzopBUilRVJ8ZY6kfntilCInxCaPvqs	2026-04-15 14:43:47
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjgzOWU0MTc3NDk1MmM2Njc0MmI0IiwiaWF0IjoxNzc2MjQwMDQ3LCJleHAiOjE3NzYyNDE4NDd9.AbdWHBp6SGnvUk8q3lBrjp848K9uSHsULTWnKNvPva8	2026-04-15 15:30:47
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJTdXBha3JpdCIsInNlc3Npb25faWQiOiIzNzdkODEyMmU0NDc5YzAyYmQ3MyIsImlhdCI6MTc3NjI0MzYyOCwiZXhwIjoxNzc2MjQ1NDI4fQ.ZSEz7y_wZbiTvnwcyHqpCrBB4wU5tok01EfaFjhKag0	2026-04-15 16:30:28
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJzZXNzaW9uX2lkIjoiNmQxZmM3NmJkYmJmZmI5YzEwYzgiLCJpYXQiOjE3NzYyNTU2MjksImV4cCI6MTc3NjI1NzQyOX0.HX21xbz5TRVq2d_4TDu6ejlIrjJiXG3EWzbZ3MIepgw	2026-04-15 19:50:29
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiJkMmJlYjUwYWNkZjVkOTdhNWQzOSIsImlhdCI6MTc3NjI1ODA0MCwiZXhwIjoxNzc2MjU5ODQwfQ.WJo3tHCNXVBPiFQ-S8CeuI-GGj5T-WXU8VdICYGCoaQ	2026-04-15 20:30:40
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjU3YzMzYzFhNWVjN2RjMGZhMTM0IiwiaWF0IjoxNzc2MzI2NDU4LCJleHAiOjE3NzYzMjgyNTh9.NDUeO-Vtw3Lcqe8z2YBWU7l5FCirr4qSojmqflzrSnk	2026-04-16 15:30:58
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiIwMWZiNTNmMGM1MGUxOTE2NDJjNiIsImlhdCI6MTc3NjMzMTYwOSwiZXhwIjoxNzc2MzMzNDA5fQ.uDPtaJZ2mTKNKaGeKu11Kzn-Qc_kuvrrejOC6tVW2qw	2026-04-16 16:56:49
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjVkZWU4ZDg2ZjY3NjBjNjM0MjhmIiwiaWF0IjoxNzc2MzMxNjU2LCJleHAiOjE3NzYzMzM0NTZ9.EXXqOkU3KPEyPZ6quCTo1ElPR7fgHmN9AU65IAz3dvw	2026-04-16 16:57:36
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiI3NDFlMThhZDAwZjk4MmY1NzIwNCIsImlhdCI6MTc3NjMzMjg2NywiZXhwIjoxNzc2MzM0NjY3fQ.GJWZMrfa6W2sYmvub-LbWxH8VJMLOBJInNiAb82gE-w	2026-04-16 17:17:47
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6ImYxMzBkMDQxNTM2N2E2MDM2ODY2IiwiaWF0IjoxNzc2MzMzMTM5LCJleHAiOjE3NzYzMzQ5Mzl9.toFa79AJD71_DzEHu8-t3YDhg55g3rM8XZAYYHp6qnU	2026-04-16 17:22:19
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjFhZmNhMWZkNTU2NmU0OTNjOGIyIiwiaWF0IjoxNzc2MzQ3NTYyLCJleHAiOjE3NzYzNDkzNjJ9.LTqSQG88ct0SN6dVdTN4FzOZCPOKd4VMxo_8sVtincQ	2026-04-16 21:22:42
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiJjYzE2YWZmZTY4MDFhY2RkNjkwOCIsImlhdCI6MTc3NjM1MjI1NSwiZXhwIjoxNzc2MzU0MDU1fQ.7aRNxCZHRr7chymu1VQxdJZKuE9Ii4ABjjkNuf--vYM	2026-04-16 22:40:55
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiI5MzdjMTMxZTRkYjVkNGQyZGVkOCIsImlhdCI6MTc3NjQwNjcwNywiZXhwIjoxNzc2NDA4NTA3fQ.0p1J5I19twrE_Qkdoel_Vu0cbkAq6NTTYDhiaO6uu1g	2026-04-17 13:48:27
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjlmZDJkMGQ0MmIxOGJkYzA2NWYxIiwiaWF0IjoxNzc2NDA5ODA2LCJleHAiOjE3NzY0MTE2MDZ9.u7hPRZ59adaqIO7k3VRn2f3yuk7X7u4wH15uQrQevIo	2026-04-17 14:40:06
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiJhMjQ1NTVhMjQ1ZjA4MmNhNzE2NyIsImlhdCI6MTc3NjQxMTIwOSwiZXhwIjoxNzc2NDEzMDA5fQ.O5i_q86-t8uNdgPRkCO3yJCAaWrBZTrLNqtkpnrGlsQ	2026-04-17 15:03:29
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjlmY2VlN2JhMzQ5MjdjNDY0NTczIiwiaWF0IjoxNzc2NDExNTMxLCJleHAiOjE3NzY0MTMzMzF9.uvOcnS9NTosYaq_-DPZSDWi6HRp_A8nVuHn-vMhDO_k	2026-04-17 15:08:51
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6ImM5ZTBiY2M0MDQwY2I3NTdmOTcxIiwiaWF0IjoxNzc2NDEyNjkxLCJleHAiOjE3NzY0MTQ0OTF9.Two5fl9YVHIvwuMN6iZjWFud20tPmq5dD5Bcb_ogOUI	2026-04-17 15:28:11
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiUG9uZ3BhayIsInNlc3Npb25faWQiOiI4OTdmOTIyYzQ0MjZkOTBiZDllNCIsImlhdCI6MTc3NjQ4NjA2OCwiZXhwIjoxNzc2NDg3ODY4fQ.MFYSEFCg78E2fUseowExaixpln_pZ1Qaoc9ZtsgHlZ4	2026-04-18 11:51:08
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6IjQ4NDc1NGUzN2E1NmFlNGFiMjg2IiwiaWF0IjoxNzc2NDg3NjkxLCJleHAiOjE3NzY0ODk0OTF9.dBNLutPsS9ZujsNDJD44sK12EbfxRnSEB7CT0XAdgsU	2026-04-18 12:18:11
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA0MDMiLCJyb2xlIjoidGVhY2hlciIsIm5hbWUiOiJQb25ncGFrIiwic2Vzc2lvbl9pZCI6ImQ1ZDUyYWUyYjAzYzQ4MTM4NWMwIiwiaWF0IjoxNzc2NDkyMzM0LCJleHAiOjE3NzY0OTQxMzR9.MwmIfKaXmJ7_2AFEaqynOZIShUrV6m-TU_vwhP1vlOo	2026-04-18 13:35:34
\.


--
-- TOC entry 4953 (class 0 OID 16467)
-- Dependencies: 221
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (user_id, title, name, surname, role, email, created_at, is_verified, is_active, session_id) FROM stdin;
b6630200578	นาย	Supakrit	Seekum	staff	supakrit.se@ku.th	2026-01-25 11:48:40.585447	t	t	b4775e436ecb5bf42f45
b6630200403	นาย	Pongpak	Tepee	staff	pongpak.te@ku.th	2026-01-25 11:48:40.585447	t	t	db27bdc12b79117aa053
b0000000001	ดร.	จิรวรรณ	เจริญสุข	teacher	pongpak.te@gmail.com	2026-02-14 15:46:14.671934	t	t	a3a7c7e9c4ef3ca7cea3
b0000000002	ผศ.ดร.	อรวรรณ	วัชนุภาพร	teacher	pongpak.te@gmail.com	2026-02-14 15:47:02.646935	t	t	a3a7c7e9c4ef3ca7cea3
b0000000003	อาจารย์	ชโลธร	ชูทอง	teacher	pongpak.te@gmail.com	2026-02-14 15:47:49.66541	t	t	a3a7c7e9c4ef3ca7cea3
b0000000004	อาจารย์	เฟื่องฟ้า	เป็นศิริ	teacher	pongpak.te@gmail.com	2026-02-14 15:49:35.888173	t	t	a3a7c7e9c4ef3ca7cea3
b0000000005	อาจารย์	วนิดา	คำประไพ	teacher	pongpak.te@gmail.com	2026-02-14 20:04:56.336633	t	t	a3a7c7e9c4ef3ca7cea3
\.


--
-- TOC entry 4793 (class 2606 OID 49332)
-- Name: BookingScope BookingScope_pkey; Type: CONSTRAINT; Schema: public; Owner: project_app
--

ALTER TABLE ONLY public."BookingScope"
    ADD CONSTRAINT "BookingScope_pkey" PRIMARY KEY (date_create);


--
-- TOC entry 4791 (class 2606 OID 49353)
-- Name: Terms Terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Terms"
    ADD CONSTRAINT "Terms_pkey" PRIMARY KEY (id);


--
-- TOC entry 4789 (class 2606 OID 24594)
-- Name: TokenBlacklist TokenBlacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TokenBlacklist"
    ADD CONSTRAINT "TokenBlacklist_pkey" PRIMARY KEY (token);


--
-- TOC entry 4787 (class 2606 OID 16479)
-- Name: Booking booking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT booking_pkey PRIMARY KEY (booking_id);


--
-- TOC entry 4783 (class 2606 OID 16454)
-- Name: Equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Equipment"
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (equipment_id);


--
-- TOC entry 4781 (class 2606 OID 16447)
-- Name: OTP otp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OTP"
    ADD CONSTRAINT otp_pkey PRIMARY KEY (request_id);


--
-- TOC entry 4777 (class 2606 OID 16423)
-- Name: Rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rooms"
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (room_id);


--
-- TOC entry 4779 (class 2606 OID 16430)
-- Name: Schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedules"
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (schedule_id);


--
-- TOC entry 4785 (class 2606 OID 16472)
-- Name: Users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4798 (class 2606 OID 16480)
-- Name: Booking booking_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT booking_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public."Users"(user_id);


--
-- TOC entry 4799 (class 2606 OID 16485)
-- Name: Booking booking_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT booking_room_id_fkey FOREIGN KEY (room_id) REFERENCES public."Rooms"(room_id);


--
-- TOC entry 4800 (class 2606 OID 16490)
-- Name: Booking booking_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT booking_teacher_id_fkey FOREIGN KEY (user_id) REFERENCES public."Users"(user_id);


--
-- TOC entry 4797 (class 2606 OID 16455)
-- Name: Equipment equipment_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Equipment"
    ADD CONSTRAINT equipment_room_id_fkey FOREIGN KEY (room_id) REFERENCES public."Rooms"(room_id);


--
-- TOC entry 4801 (class 2606 OID 24810)
-- Name: Booking fk_approved; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT fk_approved FOREIGN KEY (approved_by) REFERENCES public."Users"(user_id) ON DELETE SET NULL;


--
-- TOC entry 4802 (class 2606 OID 24804)
-- Name: Booking fk_room_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT fk_room_id FOREIGN KEY (room_id) REFERENCES public."Rooms"(room_id) ON DELETE SET NULL;


--
-- TOC entry 4794 (class 2606 OID 24799)
-- Name: Schedules fk_room_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedules"
    ADD CONSTRAINT fk_room_id FOREIGN KEY (room_id) REFERENCES public."Rooms"(room_id) ON DELETE SET NULL;


--
-- TOC entry 4803 (class 2606 OID 24789)
-- Name: Booking fk_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public."Users"(user_id) ON DELETE SET NULL;


--
-- TOC entry 4795 (class 2606 OID 24794)
-- Name: Schedules fk_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedules"
    ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES public."Users"(user_id) ON DELETE SET NULL;


--
-- TOC entry 4796 (class 2606 OID 16431)
-- Name: Schedules schedules_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedules"
    ADD CONSTRAINT schedules_room_id_fkey FOREIGN KEY (room_id) REFERENCES public."Rooms"(room_id);


--
-- TOC entry 4964 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO project_app;
GRANT USAGE ON SCHEMA public TO dev;


--
-- TOC entry 4965 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE "Booking"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Booking" TO project_app;
GRANT ALL ON TABLE public."Booking" TO dev;


--
-- TOC entry 4966 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE "BookingScope"; Type: ACL; Schema: public; Owner: project_app
--

GRANT ALL ON TABLE public."BookingScope" TO dev;


--
-- TOC entry 4967 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE "Equipment"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Equipment" TO project_app;
GRANT ALL ON TABLE public."Equipment" TO dev;


--
-- TOC entry 4968 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE "OTP"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."OTP" TO project_app;
GRANT ALL ON TABLE public."OTP" TO dev;


--
-- TOC entry 4969 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE "Rooms"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Rooms" TO project_app;
GRANT ALL ON TABLE public."Rooms" TO dev;


--
-- TOC entry 4970 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE "Schedules"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Schedules" TO project_app;
GRANT ALL ON TABLE public."Schedules" TO dev;


--
-- TOC entry 4971 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE "Terms"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public."Terms" TO dev;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Terms" TO project_app;


--
-- TOC entry 4972 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE "TokenBlacklist"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."TokenBlacklist" TO project_app;
GRANT ALL ON TABLE public."TokenBlacklist" TO dev;


--
-- TOC entry 4973 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE "Users"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Users" TO project_app;
GRANT ALL ON TABLE public."Users" TO dev;


--
-- TOC entry 2075 (class 826 OID 24658)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO project_app;


--
-- TOC entry 2076 (class 826 OID 24657)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO dev;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO project_app;


-- Completed on 2026-04-22 01:31:58

--
-- PostgreSQL database dump complete
--

\unrestrict 7dvsmTMxoGEShfSxghqNamtcIFge5G6BcnthXBXoTnfBK5yM88Efd6yzG66IDNv

