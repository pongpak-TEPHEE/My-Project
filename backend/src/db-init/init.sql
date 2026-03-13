--
-- PostgreSQL database dump
--

\restrict xjF2k0WPhj5dJwa3gCZLSS8ebu17hdkHVC8wef7FoX6uGpUHeUkJKZqhullyfG3

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

-- Started on 2026-03-12 23:24:58

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 223 (class 1259 OID 16473)
-- Name: Booking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Booking" (
    booking_id character varying NOT NULL,
    room_id character varying NOT NULL,
    teacher_id character varying,
    purpose character varying,
    date date,
    start_time time without time zone,
    end_time time without time zone,
    status character varying,
    approved_by character varying
);


ALTER TABLE public."Booking" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16448)
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
-- TOC entry 220 (class 1259 OID 16441)
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
-- TOC entry 218 (class 1259 OID 16417)
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
-- TOC entry 219 (class 1259 OID 16424)
-- Name: Schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Schedules" (
    schedule_id character varying NOT NULL,
    room_id character varying NOT NULL,
    subject_name character varying,
    teacher_name character varying,
    start_time time without time zone,
    end_time time without time zone,
    semester_id character varying,
    date date,
    temporarily_closed boolean,
    teacher_id character varying,
    teacher_surname character varying
);


ALTER TABLE public."Schedules" OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16403)
-- Name: Semesters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Semesters" (
    semester_id character varying NOT NULL,
    year character varying NOT NULL,
    term smallint,
    start_date date,
    end_date date
);


ALTER TABLE public."Semesters" OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 24588)
-- Name: TokenBlacklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TokenBlacklist" (
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public."TokenBlacklist" OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16467)
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
-- TOC entry 4945 (class 0 OID 16473)
-- Dependencies: 223
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Booking" (booking_id, room_id, teacher_id, purpose, date, start_time, end_time, status, approved_by) FROM stdin;
b0013	26504	b6630200403	555	2026-02-21	12:00:00	13:00:00	cancelled	\N
b0006	26504	b0000000001	5555	2026-02-19	09:00:00	12:00:00	cancelled	b6630200578
b0010	26504	b0000000004	5555	2026-02-24	22:50:00	23:50:00	cancelled	b6630200578
b0018	26504	b6630200578	55555	2026-02-23	13:00:00	16:00:00	cancelled	b6630200578
b0019	26504	b6630200578	456	2026-02-23	13:00:00	16:00:00	cancelled	b6630200578
b0004	26508	b0000000001	8888	2026-02-20	09:00:00	12:00:00	rejected	\N
b0020	26504	b6630200578	456	2026-02-23	13:00:00	16:00:00	cancelled	b6630200578
b0002	26508	b0000000001	6666	2026-02-20	17:00:00	18:00:00	cancelled	\N
b0007	26506	b0000000001	5555	2026-02-25	16:00:00	17:00:00	rejected	b6630200578
b0003	26506	b0000000001	7777	2026-02-20	22:00:00	23:00:00	cancelled	\N
5e9cdb3c-5d85-407f-bf54-c3cdc7722092	26504	b6630200578	5555	2026-02-26	15:00:00	16:00:00	cancelled	b6630200578
01898e4c-325a-4867-b95e-a3d413fad186	26508	b6630200578	555	2026-02-28	12:00:00	12:30:00	completed	b6630200578
b0014	26506	b6630200578	555	2026-02-19	22:00:00	22:30:00	completed	b6630200578
b0015	26506	b6630200578	5555	2026-02-19	21:40:00	22:00:00	completed	b6630200578
b0016	26506	b6630200578	456	2026-02-19	22:40:00	23:00:00	completed	b6630200578
b0023	26504	b6630200578	555	2026-02-22	12:00:00	13:00:00	cancelled	b6630200578
b0024	26508	b6630200578	5555	2026-02-22	12:00:00	13:00:00	cancelled	b6630200578
b0017	26506	b6630200578	852	2026-02-19	23:00:00	23:30:00	completed	b6630200578
bc3fbd6b-0f21-4358-bc1a-081265242053	26504	b6630200403	สอนวิชา Web Dev	2026-03-02	09:00:00	12:00:00	completed	b6630200578
bf060f45-f05e-4655-a17d-7444b5d78bf7	26504	b6630200578	556	2026-03-12	15:00:00	16:00:00	cancelled	\N
b0001	26506	b0000000001	7777	2026-02-10	15:30:00	16:30:00	completed	\N
b0021	26504	b6630200578	444	2026-03-03	12:00:00	13:00:00	cancelled	b6630200578
b0022	26504	b6630200578	555	2026-02-24	09:00:00	18:00:00	cancelled	b6630200578
b0008	26506	b0000000004	7777	2026-02-16	20:40:00	21:00:00	completed	\N
b0025	26504	b6630200578	555	2026-02-22	22:20:00	22:50:00	completed	b6630200578
b0005	26512	b0000000001	9999	2026-02-20	12:00:00	13:00:00	completed	b6630200578
b0026	26504	b6630200578	555	2026-03-03	13:00:00	16:00:00	cancelled	b6630200578
dfda64eb-1b3e-4ed1-bc48-e850d1e25bd8	26504	b6630200403	ธุระส่วนตัว	2026-03-07	13:00:00	15:30:00	cancelled	b6630200403
b0009	26506	b0000000004	7777	2026-02-22	21:00:00	22:00:00	completed	b6630200578
01898e4c-325a-4867-b95e-a3d413fad185	26504	b6630200578	555	2026-02-26	17:00:00	18:00:00	completed	b6630200578
a1a19685-9889-44ab-8e83-30185d41de06	26512	b6630200578	5555	2026-02-26	14:00:00	15:00:00	cancelled	\N
1b89b691-5294-464f-898c-0d711c42ca80	26504	b6630200403	ใช้งาน ทำกิจกรรมโรงเรียน	2026-03-06	20:10:00	03:21:00	cancelled	b6630200403
89a2ee17-0b5b-4f56-b491-58c73a93ae04	26504	b6630200578	555	2026-03-13	17:07:00	18:09:00	cancelled	b6630200578
b0011	26504	b6630200578	5555	2026-02-22	12:00:00	12:30:00	cancelled	\N
b0012	150411	b6630200578	6666	2026-02-23	12:30:00	13:30:00	cancelled	b6630200578
c00f0368-6d15-476c-8d29-76307419fb81	26504	b6630200578	5555	2026-03-14	17:50:00	18:50:00	cancelled	b6630200578
80e85ebc-a1b6-487d-8eb9-c76c623d04dc	26504	b6630200578	5555	2026-03-13	15:00:00	17:00:00	cancelled	b6630200578
dea93c87-07a3-4170-affa-4e9640d994fe	26504	b6630200578	000	2026-03-13	17:00:00	18:59:00	cancelled	b6630200578
58d3ebb1-e5b8-40ab-b078-02c9caebc8b2	26504	b6630200578	555	2026-03-14	15:00:00	16:00:00	cancelled	b6630200578
1c96442f-33f5-4b62-a2a3-76614bc6e399	กกก	b6630200578	555	2026-03-12	17:00:00	18:00:00	cancelled	b6630200578
5cdad267-08a9-410a-835b-df4879a9948b	กกก	b6630200578	557	2026-03-10	15:00:00	16:00:00	cancelled	\N
cdd382b5-ff70-4cf1-be0f-0eb0b42a3c44	26504	b6630200578	555	2026-03-13	22:07:00	23:19:00	approved	b6630200578
d2802b47-a332-46a0-9588-75c6220c850e	26504	b6630200578	5555	2026-03-14	15:00:00	16:00:00	approved	b6630200578
abc30adf-28d8-43a2-81f6-532119164646	26504	b6630200403	55555	2026-03-19	05:50:00	17:50:00	cancelled	\N
880edf02-4901-4be6-8153-884cc9093816	26506	b6630200403	กหดำ	2026-03-17	08:51:00	12:51:00	cancelled	\N
16556b9b-ce2a-4c28-8d3e-88caba789efc	26504	b6630200403	ทดสอบ การจองห้อง	2026-03-14	08:30:00	12:00:00	cancelled	\N
\.


--
-- TOC entry 4943 (class 0 OID 16448)
-- Dependencies: 221
-- Data for Name: Equipment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Equipment" (equipment_id, room_id, computer, microphone, type_of_computer, whiteboard, projector) FROM stdin;
eq-26506	26506	50	2	VDI	1	1
eq-26508	26508	50	1	VDI	1	1
eq-26512	26512	50	2	VDI	1	1
eq-กกก	กกก	0	0	-	0	0
eq-150411	150411	0	0	-	0	0
eq-231213	231213	1	1	-	1	1
eq-150412	150412	50	1	PC	1	1
eq-150413	150413	50	1	PC	1	1
eq-150414	150414	50	1	PC	1	1
eq-150415	150415	50	1	PC	1	1
eq-SeniorProject	SeniorProject	0	0	PC	0	5
eq-555	555	0	0	PC	0	0
eq-5555	5555	6	6	VDI	6	6
eq-456	456	0	0	-	0	0
eq-26504	26504	45	20	-	1	1
eq-150416	150416	0	0	-	0	0
\.


--
-- TOC entry 4942 (class 0 OID 16441)
-- Dependencies: 220
-- Data for Name: OTP; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OTP" (request_id, email, otp_code, expired_at, created_at) FROM stdin;
\.


--
-- TOC entry 4940 (class 0 OID 16417)
-- Dependencies: 218
-- Data for Name: Rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Rooms" (room_id, room_type, capacity, location, room_characteristics, repair, is_active) FROM stdin;
SeniorProject	Computer lab	45	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	f
26504	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
555	555	5555	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	5555	t	f
กกก	กกก2	0	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา		f	t
150412	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150413	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
26506	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
26508	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
26512	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
5555	666	66	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	666	t	f
456		0	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา		t	f
150414	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150415	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150411	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150416	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
231213	123dsf	3	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	fsdfss	f	t
\.


--
-- TOC entry 4941 (class 0 OID 16424)
-- Dependencies: 219
-- Data for Name: Schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Schedules" (schedule_id, room_id, subject_name, teacher_name, start_time, end_time, semester_id, date, temporarily_closed, teacher_id, teacher_surname) FROM stdin;
b02b141d-1b3b-44e4-b30e-2c3275cb69af	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-11-24	f	b0000000001	เจริญสุข
29d0b2d7-bbc2-4f5c-a85c-71740d3d44ef	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-01	f	b0000000001	เจริญสุข
777243d8-cd92-4ef7-925f-b488ec441ef6	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-08	f	b0000000001	เจริญสุข
b914f6fe-a574-42be-973a-2a28c54ea922	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-15	f	b0000000001	เจริญสุข
7b539299-e898-44cc-984e-3ee0e3444ac5	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-22	f	b0000000001	เจริญสุข
ab3107b4-655c-4b95-9950-9baa721b2ec7	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-29	f	b0000000001	เจริญสุข
60292f89-31fe-4966-a79c-b7a72196d31d	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-05	f	b0000000001	เจริญสุข
c7651246-405d-4371-9390-9c772f15b3e7	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-12	f	b0000000001	เจริญสุข
c553a402-fa61-41d8-bd49-0a73b8eb1790	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-19	f	b0000000001	เจริญสุข
c5bc721f-869a-4c9a-b0eb-e040ca857db7	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-26	f	b0000000001	เจริญสุข
e895cadf-afad-4e10-9e5e-78e65e5866bf	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-02	f	b0000000001	เจริญสุข
da956ab4-a244-4bd7-932d-8df9bd845a9c	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-09	f	b0000000001	เจริญสุข
6287d18b-3c72-4b13-b073-1a945ba65000	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-16	f	b0000000001	เจริญสุข
a69b5b8d-9622-4c91-a2e8-846fb1e3491b	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-23	f	b0000000001	เจริญสุข
ede8623e-468a-4b12-a2d7-5a55ccc0be33	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-03-02	f	b0000000001	เจริญสุข
f095b0e7-1fb7-4ebd-b544-cd7f3ad063cc	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-11-25	f	b0000000005	คำประไพ
5f6f9941-f71c-417e-9ee8-f0f2a4a0f1cf	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-02	f	b0000000005	คำประไพ
c8f256a0-7797-4120-92cc-a4aa6f56fac2	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-09	f	b0000000005	คำประไพ
40e34e63-0e63-40c6-96f3-928ed0397a65	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-16	f	b0000000005	คำประไพ
96c01c00-cdf8-4ef3-b7c9-c52b39476fb9	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-23	f	b0000000005	คำประไพ
1ad4aa53-cebf-4d36-8c1a-13ede94f2bb8	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-30	f	b0000000005	คำประไพ
8939f866-7090-456f-9dae-962ac26b04fd	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-06	f	b0000000005	คำประไพ
6f0a0fa3-aada-4b82-a55c-2be8fe643e3f	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-13	f	b0000000005	คำประไพ
2f160cd0-a136-4b51-8d32-d3436e2cee4c	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-20	f	b0000000005	คำประไพ
88f9b340-6413-4da1-97e4-7f89bf3fa746	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-27	f	b0000000005	คำประไพ
29039751-3b7e-4c00-ac04-399bd2edf191	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-03	f	b0000000005	คำประไพ
103bdcfe-b875-4721-a7f9-d762f30deb5f	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-10	f	b0000000005	คำประไพ
f0859ef7-b284-48f4-b3f4-b4dd7b9133d3	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-17	f	b0000000005	คำประไพ
4574628c-0660-4a3d-bd92-901459dca2df	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-24	f	b0000000005	คำประไพ
d6453af6-4dec-4c10-befc-1c1e9a7ff9b6	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-03-03	f	b0000000005	คำประไพ
dd2ff32c-03ea-4e7a-9da6-dd9a48385f12	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-11-25	f	b0000000005	คำประไพ
eaf72bc6-3283-4431-b621-2c2b6f8f4ee2	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-02	f	b0000000005	คำประไพ
1dfd5e45-f69b-4aa2-aa3d-f9a02e8632cb	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-09	f	b0000000005	คำประไพ
81895417-781e-48f9-b565-3211bc274661	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-16	f	b0000000005	คำประไพ
a296b0ea-1c98-4fba-ba8a-a78d1e26c607	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-23	f	b0000000005	คำประไพ
8a967ad0-a1df-4500-81f6-82b633bd5664	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-30	f	b0000000005	คำประไพ
5ba24e49-3733-46fe-b889-265da4c1527d	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-06	f	b0000000005	คำประไพ
36868062-e7f8-4b7a-aff4-f194b8c50cbd	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-13	f	b0000000005	คำประไพ
a935af3d-c01e-4aa4-82f3-3e1cf786f431	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-20	f	b0000000005	คำประไพ
57b252f6-e909-4eee-8656-86295e0f1404	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-27	f	b0000000005	คำประไพ
2ffdab2b-e286-48c0-a0d7-52c74c3723d1	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-03	f	b0000000005	คำประไพ
34b000e3-69ab-45af-834f-f2fd2d2fb75d	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-10	f	b0000000005	คำประไพ
b6de7511-8571-485d-b0ac-6767299c980f	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-17	f	b0000000005	คำประไพ
2d9fc9ff-8cc7-453e-a020-0ee4094261f3	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-24	f	b0000000005	คำประไพ
51da339b-d0cb-42a4-9e7a-0c1d5186c82d	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-03-03	f	b0000000005	คำประไพ
6e4b3d09-5537-462e-8c8c-2c9ac1af48b2	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-11-26	f	b0000000002	วัชนุภาพร
7f993868-f3ac-46d6-8e8e-fb30d877088c	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-03	f	b0000000002	วัชนุภาพร
b78e854d-dedf-403a-b67b-9187a8d02b15	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-10	f	b0000000002	วัชนุภาพร
f5050333-01cc-4b80-8d73-9e2217869db2	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-17	f	b0000000002	วัชนุภาพร
3bee599f-b896-498d-92e6-5e84d8df667e	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-24	f	b0000000002	วัชนุภาพร
135d5c47-8fb8-4c38-bac3-fb26184d274b	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-31	f	b0000000002	วัชนุภาพร
43f6ec11-8327-4f4a-8f8a-c0c306354c25	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-07	f	b0000000002	วัชนุภาพร
6efd949e-d3d7-487c-b647-7ff45df3027b	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-14	f	b0000000002	วัชนุภาพร
0981ea48-bcd4-4ad8-9759-0af32742ae26	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-21	f	b0000000002	วัชนุภาพร
5685ea5c-88ac-42a8-b92b-f55d6a0a3784	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-28	f	b0000000002	วัชนุภาพร
9a62caaf-f062-432e-98bf-7108865e6ae1	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-04	f	b0000000002	วัชนุภาพร
bc058109-363d-4460-b341-2b2f5864941e	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-11	f	b0000000002	วัชนุภาพร
4169002b-0f41-4f0a-a8b3-ae3d9a18ca11	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-18	f	b0000000002	วัชนุภาพร
83aa0dd0-d603-4317-af47-6d92f687411f	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-25	f	b0000000002	วัชนุภาพร
5c9a05df-fc86-48a9-a951-f2e924afcf7e	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-03-04	f	b0000000002	วัชนุภาพร
4df33db8-b0f7-4386-83a7-47b70eaddf04	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-11-26	f	b0000000003	ชูทอง
13e66f4b-d891-4ade-b24a-349968bd5b87	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-03	f	b0000000003	ชูทอง
459b25f2-30b8-4b3a-99e3-b65e506e3d7c	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-10	f	b0000000003	ชูทอง
8aa71bb5-d983-4495-b7ea-b1f99b1f144e	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-17	f	b0000000003	ชูทอง
36a6f2d0-931d-4a0d-a0f4-c0162b44e116	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-24	f	b0000000003	ชูทอง
8948f33d-9e6d-4e67-b008-cda23d46c620	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-31	f	b0000000003	ชูทอง
bac44030-783b-481e-916a-f0f9352225b3	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-07	f	b0000000003	ชูทอง
2e86c7a9-6c75-4a0a-b0f6-53ba63e443de	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-14	f	b0000000003	ชูทอง
4d45eafa-9799-4640-8e43-987da2159e45	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-21	f	b0000000003	ชูทอง
2649e810-6f6d-4258-bf72-a4b20b51c3fa	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-28	f	b0000000003	ชูทอง
e0b4a6c6-630d-4f56-a72a-01ff098da495	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-04	f	b0000000003	ชูทอง
f9eddb63-dbd2-4951-991f-7553a58e2979	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-11	f	b0000000003	ชูทอง
491a31d5-7bf5-4558-9425-121e0c008be5	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-18	f	b0000000003	ชูทอง
64952f34-8760-446f-90ac-5f3eaae40e0b	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-25	f	b0000000003	ชูทอง
d9052382-cc44-49be-92b1-9eafd03b7027	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-03-04	f	b0000000003	ชูทอง
e02a1aa6-3ace-43f9-a6c9-a2bd0801c009	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-11-26	f	b0000000004	เป็นศิริ
5cfb7366-c565-4373-b02a-555cc557b174	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-03	f	b0000000004	เป็นศิริ
34c70b6c-a373-49ee-bac7-aa251e25e711	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-10	f	b0000000004	เป็นศิริ
b15f68b4-70da-4de4-8f8b-8b04555520c5	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-17	f	b0000000004	เป็นศิริ
3d4bba4a-b0fb-4799-a96b-f792cef55f08	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-24	f	b0000000004	เป็นศิริ
2d408566-2157-466f-90a2-104b5eec58d1	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-31	f	b0000000004	เป็นศิริ
c86d83ab-5245-47ce-9439-1dd2dabdf13b	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-07	f	b0000000004	เป็นศิริ
af1d6cb6-50bb-45af-bbbd-32b93de66d60	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-14	f	b0000000004	เป็นศิริ
7b5dbabc-3795-4757-9487-f749027f7b5e	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-21	f	b0000000004	เป็นศิริ
503a0c15-b339-4f82-ad05-75a35b61e500	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-28	f	b0000000004	เป็นศิริ
0d838f6f-3f0f-4681-9b8f-4175f22c3cd6	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-04	f	b0000000004	เป็นศิริ
5334f0c9-8b06-4c05-90fc-cb0adc39c5ee	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-11	f	b0000000004	เป็นศิริ
74cd5f27-6329-43ec-9f0e-f3786afad1a7	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-18	f	b0000000004	เป็นศิริ
0df5c5fb-fc43-46ce-aa75-0896a1cdb8e8	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-25	f	b0000000004	เป็นศิริ
25cae530-eaf7-4e45-846e-1df6b57fabb3	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-03-04	f	b0000000004	เป็นศิริ
9241c8cf-de98-45f3-a03c-3f8ba2533733	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-11-27	f	b0000000002	วัชนุภาพร
cd6e1305-b2d7-4dc2-be56-3d6226c0a79e	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-04	f	b0000000002	วัชนุภาพร
ddad0de7-612f-417e-bf7c-71a3c5748d05	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-11	f	b0000000002	วัชนุภาพร
c5e1525f-a82a-414b-ba23-894a7fa0c0af	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-18	f	b0000000002	วัชนุภาพร
93342624-af56-4f4b-984e-7845b9fcb43a	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-25	f	b0000000002	วัชนุภาพร
11372891-db36-4e6f-afcd-1b4bebbb18a0	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-01	f	b0000000002	วัชนุภาพร
a44d2801-51b8-4835-9e17-e49c4722236d	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-08	f	b0000000002	วัชนุภาพร
90077cec-3bd4-42ed-953f-ce4d70115e4a	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-15	f	b0000000002	วัชนุภาพร
d5e73d1a-bfc6-46b7-bd8b-065a02aa0f97	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-22	f	b0000000002	วัชนุภาพร
57cf817c-b94d-475b-941c-a3f97f1e7b3c	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-29	f	b0000000002	วัชนุภาพร
b6e46d10-44b5-41e2-a02c-56592dac97b6	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-05	f	b0000000002	วัชนุภาพร
879c45d7-79f7-4466-9d3c-7ed26a2b5813	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-12	f	b0000000002	วัชนุภาพร
fd079abb-98b9-4ad3-89c4-4899cff92fb3	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-19	f	b0000000002	วัชนุภาพร
8c3d2b0f-20b5-4c1f-be4e-497802defebc	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-26	f	b0000000002	วัชนุภาพร
05f983fd-b6d2-4962-afa3-f74c26b07322	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-03-05	f	b0000000002	วัชนุภาพร
86f5299c-6015-4cf5-9f37-6d2e6596f364	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-11-27	f	b0000000004	เป็นศิริ
a2f5dc28-2fc5-4e55-9bf3-f1a4fe011a1a	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-04	f	b0000000004	เป็นศิริ
d7303379-9595-4c6d-a645-55e6b0453282	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-11	f	b0000000004	เป็นศิริ
8eeca25e-40de-4c05-bfce-80b874a918ef	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-18	f	b0000000004	เป็นศิริ
6be42323-337a-404e-9cb4-85cfebc45acf	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-25	f	b0000000004	เป็นศิริ
5c1ddf37-6a40-4788-8ef2-91ac34cc7622	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-01	f	b0000000004	เป็นศิริ
c02b5e0b-3b95-4c08-a2f4-bf5f2d3c3c86	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-08	f	b0000000004	เป็นศิริ
84318246-fcfe-4ace-87e7-c638e8329bc3	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-15	f	b0000000004	เป็นศิริ
5ac6f7f8-d49b-439c-8c56-857698d4a594	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-22	f	b0000000004	เป็นศิริ
d0f587a2-282c-4398-8166-c2ca20ef33da	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-29	f	b0000000004	เป็นศิริ
34856876-d187-49ff-97e1-5cc0b7b826f3	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-05	f	b0000000004	เป็นศิริ
b7c1c809-f25c-4569-8944-a2d31aeb159f	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-12	f	b0000000004	เป็นศิริ
cc9aad63-bccb-4ccb-9534-fd22d54191e5	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-19	f	b0000000004	เป็นศิริ
c0f8567f-02da-4c51-8477-0f0f85fbf0f8	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-26	f	b0000000004	เป็นศิริ
76f2fe64-2a6d-48ad-8613-133befd8caaa	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-03-05	f	b0000000004	เป็นศิริ
\.


--
-- TOC entry 4939 (class 0 OID 16403)
-- Dependencies: 217
-- Data for Name: Semesters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Semesters" (semester_id, year, term, start_date, end_date) FROM stdin;
2025/2	2025	1	2025-11-24	2026-03-15
\.


--
-- TOC entry 4946 (class 0 OID 24588)
-- Dependencies: 224
-- Data for Name: TokenBlacklist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TokenBlacklist" (token, expires_at) FROM stdin;
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjY2MzAyMDA1NzgiLCJyb2xlIjoic3RhZmYiLCJuYW1lIjoiU3VwYWtyaXQiLCJpYXQiOjE3NzAzODc3NzEsImV4cCI6MTc3MDQ3NDE3MX0.rbZ5cV8N_IGSB8wXjSmJOMmDdJr-Ep7q_BtojlbdmUY	2026-02-07 21:22:51
\.


--
-- TOC entry 4944 (class 0 OID 16467)
-- Dependencies: 222
-- Data for Name: Users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Users" (user_id, title, name, surname, role, email, created_at, is_verified, is_active, session_id) FROM stdin;
b0000000004	นาง	เฟื่องฟ้า	เป็นศิริ	teacher	pongpak.te@gmail.com	2026-02-14 15:49:35.888173	t	t	\N
b0000000005	นาง	วนิดา	คำประไพ	teacher	pongpak.te@gmail.com	2026-02-14 20:04:56.336633	t	t	\N
b6630200403	นาย	Pongpak	Tepee	staff	pongpak.te@ku.th	2026-01-25 11:48:40.585447	t	t	0190c2397693a082c037
b6630200578	นาย	Supakrit	Seekum	teacher	supakrit.se@ku.th	2026-01-25 11:48:40.585447	t	t	39f364885f4eae2d7816
b0000000002	นาง	อรวรรณ	วัชนุภาพร	teacher	pongpak.te@gmail.com	2026-02-14 15:47:02.646935	t	f	\N
b0000000003	นาง	ชโลธร	ชูทอง	teacher	pongpak.te@gmail.com	2026-02-14 15:47:49.66541	f	t	\N
t009	นาง	df	ddsf	teacher	sdf@ku.th	2026-03-11 22:15:38.97494	f	t	\N
ไๆฟำๆไ	นาง	ำๆไำ	ๆไำๆไ	teacher	shjdflijs@ku.th	2026-03-11 22:20:28.987814	f	t	\N
b0000000001	นาง	จิรวรรณ	เจริญสุข	teacher	pongpak.te@gmail.com	2026-02-14 15:46:14.671934	f	t	\N
sdfsd	นาย	fsdf	sdfsd	teacher	fsdfsdW@ku.th	2026-03-11 22:20:57.309452	f	t	\N
\.


--
-- TOC entry 4787 (class 2606 OID 24594)
-- Name: TokenBlacklist TokenBlacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TokenBlacklist"
    ADD CONSTRAINT "TokenBlacklist_pkey" PRIMARY KEY (token);


--
-- TOC entry 4785 (class 2606 OID 16479)
-- Name: Booking booking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT booking_pkey PRIMARY KEY (booking_id);


--
-- TOC entry 4781 (class 2606 OID 16454)
-- Name: Equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Equipment"
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (equipment_id);


--
-- TOC entry 4779 (class 2606 OID 16447)
-- Name: OTP otp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OTP"
    ADD CONSTRAINT otp_pkey PRIMARY KEY (request_id);


--
-- TOC entry 4775 (class 2606 OID 16423)
-- Name: Rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rooms"
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (room_id);


--
-- TOC entry 4777 (class 2606 OID 16430)
-- Name: Schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedules"
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (schedule_id);


--
-- TOC entry 4773 (class 2606 OID 16409)
-- Name: Semesters semesters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Semesters"
    ADD CONSTRAINT semesters_pkey PRIMARY KEY (semester_id);


--
-- TOC entry 4783 (class 2606 OID 16472)
-- Name: Users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Users"
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4791 (class 2606 OID 16480)
-- Name: Booking booking_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT booking_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public."Users"(user_id);


--
-- TOC entry 4792 (class 2606 OID 16485)
-- Name: Booking booking_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT booking_room_id_fkey FOREIGN KEY (room_id) REFERENCES public."Rooms"(room_id);


--
-- TOC entry 4793 (class 2606 OID 16490)
-- Name: Booking booking_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT booking_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."Users"(user_id);


--
-- TOC entry 4790 (class 2606 OID 16455)
-- Name: Equipment equipment_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Equipment"
    ADD CONSTRAINT equipment_room_id_fkey FOREIGN KEY (room_id) REFERENCES public."Rooms"(room_id);


--
-- TOC entry 4788 (class 2606 OID 16431)
-- Name: Schedules schedules_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedules"
    ADD CONSTRAINT schedules_room_id_fkey FOREIGN KEY (room_id) REFERENCES public."Rooms"(room_id);


--
-- TOC entry 4789 (class 2606 OID 16436)
-- Name: Schedules schedules_semester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Schedules"
    ADD CONSTRAINT schedules_semester_id_fkey FOREIGN KEY (semester_id) REFERENCES public."Semesters"(semester_id);


--
-- TOC entry 4952 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO project_app;


--
-- TOC entry 4953 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE "Booking"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Booking" TO project_app;


--
-- TOC entry 4954 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE "Equipment"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Equipment" TO project_app;


--
-- TOC entry 4955 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE "OTP"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."OTP" TO project_app;


--
-- TOC entry 4956 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE "Rooms"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Rooms" TO project_app;


--
-- TOC entry 4957 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE "Schedules"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Schedules" TO project_app;


--
-- TOC entry 4958 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE "Semesters"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Semesters" TO project_app;


--
-- TOC entry 4959 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE "TokenBlacklist"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."TokenBlacklist" TO project_app;


--
-- TOC entry 4960 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE "Users"; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public."Users" TO project_app;


--
-- TOC entry 2072 (class 826 OID 24658)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO project_app;


--
-- TOC entry 2071 (class 826 OID 24657)-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO project_app;


-- Completed on 2026-03-12 23:24:58

--
-- PostgreSQL database dump complete
--

\unrestrict xjF2k0WPhj5dJwa3gCZLSS8ebu17hdkHVC8wef7FoX6uGpUHeUkJKZqhullyfG3

