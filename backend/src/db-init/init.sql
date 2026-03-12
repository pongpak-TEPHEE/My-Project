--
-- PostgreSQL database dump
--

\restrict uuFwlr3VJgT2ayuFyMFsZRz6EHBYZgFDVynfcfHC67ytKp4gBt8bHZBTfKpdRxt

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

-- Started on 2026-03-12 14:16:07

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
abc30adf-28d8-43a2-81f6-532119164646	26504	b6630200403	55555	2026-03-19	05:50:00	17:50:00	pending	\N
880edf02-4901-4be6-8153-884cc9093816	26506	b6630200403	กหดำ	2026-03-17	08:51:00	12:51:00	pending	\N
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
ddc98f4f-bd8f-4e7f-aeee-560e72650595	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-11-24	f	b0000000001	เจริญสุข
c1fd01d3-30a9-47e3-ab5e-3d439e3dbd23	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-01	f	b0000000001	เจริญสุข
9efe413b-9fc7-404a-8369-abf927a0d1d0	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-08	f	b0000000001	เจริญสุข
b98425cc-5f9c-442d-8096-19346f7a8291	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-15	f	b0000000001	เจริญสุข
57a19284-9160-475a-a32b-6aa3ee968e50	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-22	f	b0000000001	เจริญสุข
c7154f02-8186-4fd6-baa3-fd8c033b9f81	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-29	f	b0000000001	เจริญสุข
9f6447c2-dbf6-4f96-80e3-6b9e321a3f5a	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-05	f	b0000000001	เจริญสุข
4aa0089e-e230-4323-bca0-4e9574b60633	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-12	f	b0000000001	เจริญสุข
45ee7773-9dd8-4a69-98e9-da43c5f9d141	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-19	f	b0000000001	เจริญสุข
0a11d1c1-0460-4bfe-87c0-a6ba7ae9e637	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-26	f	b0000000001	เจริญสุข
cec2d6d8-757e-4ad8-9181-3cb0010ab159	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-02	f	b0000000001	เจริญสุข
a242f105-f4cd-4749-94cb-6bd4dfbaa47f	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-09	f	b0000000001	เจริญสุข
c4f8911e-efa2-4867-ad33-4525cb68ea67	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-16	f	b0000000001	เจริญสุข
94480c69-d6db-4c80-9dfe-b9be264faa47	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-23	f	b0000000001	เจริญสุข
50862c25-7cfc-4d9e-ab5b-a309b78b6ac7	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-03-02	f	b0000000001	เจริญสุข
35fdd6d8-12f2-42b9-87dc-e7b1c117af20	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-11-25	f	b0000000005	คำประไพ
6489ef59-5c0e-4ca7-b6fa-d87ec8ee25ce	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-02	f	b0000000005	คำประไพ
0d3bfc90-74ad-4783-9708-cbb66178be48	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-09	f	b0000000005	คำประไพ
7c4071fa-5fe9-440d-90fd-80c769c2e71c	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-16	f	b0000000005	คำประไพ
2715881a-6e37-4658-9015-c1952c757378	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-23	f	b0000000005	คำประไพ
b27f693f-d4de-43ab-a316-07e870cf808b	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-30	f	b0000000005	คำประไพ
e46b49c1-2dbf-4965-95b1-e949efe2ef60	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-06	f	b0000000005	คำประไพ
4ee8797c-7dae-424d-a098-ca99a347f19e	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-13	f	b0000000005	คำประไพ
151e4b98-f316-4e95-8975-c4f0148f37ca	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-20	f	b0000000005	คำประไพ
c3e2650e-8c87-442b-8a26-298a77e6dacd	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-27	f	b0000000005	คำประไพ
b77c341b-3950-44d2-ae99-bf6e22954fcf	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-10	f	b0000000005	คำประไพ
3c8239dd-a3ab-4e57-bf7b-0c71a87e19ed	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-17	f	b0000000005	คำประไพ
dced45ea-de2b-44f9-a0ec-dd63bb96949f	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-24	f	b0000000005	คำประไพ
bc500bf7-c355-4a2e-8dcb-3276c32dfde3	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-11-25	f	b0000000005	คำประไพ
55bd73ca-b554-4b55-9e01-80a54bd2997d	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-02	f	b0000000005	คำประไพ
752e8163-d219-49fb-8f6b-6a71f3458981	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-09	f	b0000000005	คำประไพ
94c597a9-33f5-4361-8d6a-edb619a59517	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-16	f	b0000000005	คำประไพ
06c0d0f7-47b0-4ce1-93e8-5f23d3c737a8	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-23	f	b0000000005	คำประไพ
c1028309-a2d6-48a3-8ff7-4275986a2f96	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-30	f	b0000000005	คำประไพ
fe63eb2b-9fa4-41fa-9123-2a3d22574d41	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-06	f	b0000000005	คำประไพ
23790278-1029-4dc7-8307-1024a3e62c55	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-03	t	b0000000005	คำประไพ
bd8c2ada-3e88-4c23-add6-0a165662f984	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-13	f	b0000000005	คำประไพ
2c3c3782-8fb0-4e8e-9609-41e989179a24	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-20	f	b0000000005	คำประไพ
e1a44857-8bf6-4307-baa4-3635c12ef6fd	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-27	f	b0000000005	คำประไพ
81b5d42a-c09a-4175-92b3-64990a239426	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-03	f	b0000000005	คำประไพ
99f0189f-98b0-4673-b44d-bf5464c77b7e	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-10	f	b0000000005	คำประไพ
1845bd45-7924-4b77-9cda-600274debb90	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-17	f	b0000000005	คำประไพ
efb78dfc-f8d7-4c4f-ad38-77bfb7e5fd9e	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-24	f	b0000000005	คำประไพ
482fad5b-0f12-489e-916f-2fff34ba9c57	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-03-03	f	b0000000005	คำประไพ
41465c47-36bd-4651-9cd5-ba0682e96a82	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-11-26	f	b0000000002	วัชนุภาพร
7113c1b5-8464-4406-b809-dc49969ad7b3	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-03	f	b0000000002	วัชนุภาพร
83332efb-8bf1-444e-bc39-b1d1912c6bc8	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-10	f	b0000000002	วัชนุภาพร
c699043e-d301-4d73-9259-d29ef2f5e5d9	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-17	f	b0000000002	วัชนุภาพร
845beace-5c78-403e-8109-917532107ae2	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-24	f	b0000000002	วัชนุภาพร
53f51e4f-9a94-4cec-a52a-9e3150645705	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-31	f	b0000000002	วัชนุภาพร
fc94f2e6-2a14-47cd-89c7-a4807f9591cd	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-07	f	b0000000002	วัชนุภาพร
ff0c4345-7a11-4762-91e4-8d19ecfbed08	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-14	f	b0000000002	วัชนุภาพร
dd0ae181-8801-418d-9308-48b338e1c0fa	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-21	f	b0000000002	วัชนุภาพร
1a03d462-a36f-4886-94d0-e7fce1353bb2	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-28	f	b0000000002	วัชนุภาพร
b98a2abd-eac3-4ecb-8e9d-346e7f677d03	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-04	f	b0000000002	วัชนุภาพร
e912bf74-6601-4901-8b44-48f772c260d6	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-11	f	b0000000002	วัชนุภาพร
b31afe28-5d69-41be-98c1-e44b4b253fb7	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-18	f	b0000000002	วัชนุภาพร
fc22789c-08a3-4cc5-b4c9-a028ccd0f1ab	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-25	f	b0000000002	วัชนุภาพร
f7d49c15-914c-4a5e-8aeb-3ca681f8f183	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-03-04	f	b0000000002	วัชนุภาพร
da084358-2f6b-4ae9-bbb8-067bacf722de	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-11-26	f	b0000000003	ชูทอง
49f099bc-4490-420c-af59-ee8f6f66573e	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-03	f	b0000000003	ชูทอง
0eefe0fe-fbd7-4dc3-91e1-0b453f7818f6	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-10	f	b0000000003	ชูทอง
fe9e8474-eac1-4cad-af2f-e9098651d280	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-17	f	b0000000003	ชูทอง
bc4346d8-33b2-4124-8a1e-ff4db456e930	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-24	f	b0000000003	ชูทอง
8aaeade2-b469-4a58-9389-f82fee5769f9	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-31	f	b0000000003	ชูทอง
eb16920a-2702-408e-9f8f-d1fe1674c8ce	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-07	f	b0000000003	ชูทอง
e8f0b07f-96af-4c6b-bd82-989e62f8a555	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-14	f	b0000000003	ชูทอง
4e5516aa-5400-4ea1-bd79-5343fd9e74e2	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-21	f	b0000000003	ชูทอง
a18c6733-23c6-4e58-afa4-e59d282b41ac	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-28	f	b0000000003	ชูทอง
4ab8ffae-f814-4fb8-a6af-64bed8d39d51	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-04	f	b0000000003	ชูทอง
bf076a9f-2621-4693-9a54-5a7598727e21	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-11	f	b0000000003	ชูทอง
a996de60-cc51-4a0e-a458-786e9b5d5307	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-18	f	b0000000003	ชูทอง
fb31f5df-8f85-4999-9a72-f01d912a2b59	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-25	f	b0000000003	ชูทอง
0ad3a7c5-b8e9-4b4b-8db5-1cfd02ef1957	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-03-04	f	b0000000003	ชูทอง
ac876d07-6d43-41ac-88df-63b51a38683f	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-11-26	f	b0000000004	เป็นศิริ
71fa458c-6fa3-4c80-8822-6196dbda0099	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-03	f	b0000000004	เป็นศิริ
42f39f7b-20b0-44b2-b89d-029e79896e7b	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-10	f	b0000000004	เป็นศิริ
e177e8b9-5afc-4425-9d92-25ea388855e2	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-17	f	b0000000004	เป็นศิริ
30c801da-df49-4ccc-8c6c-177fa4075e98	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-24	f	b0000000004	เป็นศิริ
c818ce74-71bf-4c85-85d3-cdb24b20381c	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-31	f	b0000000004	เป็นศิริ
847f6f76-9044-401d-ae17-2eb65e3c153d	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-07	f	b0000000004	เป็นศิริ
09920433-84ef-434f-832e-53328bb00427	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-14	f	b0000000004	เป็นศิริ
d6dd59b1-b2f0-401a-b609-0bc80de4a830	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-21	f	b0000000004	เป็นศิริ
e562d80b-f36a-4ff0-b2cd-29031682ef51	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-28	f	b0000000004	เป็นศิริ
03cd9cbe-8b70-44be-8497-e04d7cdf9010	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-04	f	b0000000004	เป็นศิริ
d08fc717-1198-4cd4-9b92-94f73a6539e8	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-11	f	b0000000004	เป็นศิริ
fe2fe1b2-e41a-4407-98f6-939ee6070e8b	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-18	f	b0000000004	เป็นศิริ
4ccfb2c7-9bf6-4d7c-b7a8-4d8f241035f0	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-25	f	b0000000004	เป็นศิริ
0115592b-19af-4547-91f5-2c4f761c530c	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-03-04	f	b0000000004	เป็นศิริ
424efae8-2c67-47c5-85d6-97f373ea7989	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-11-27	f	b0000000002	วัชนุภาพร
f2444360-4d9f-4f30-b7bc-118530e42187	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-04	f	b0000000002	วัชนุภาพร
4a1f23d2-a55b-4cbf-986f-e0f528280f80	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-11	f	b0000000002	วัชนุภาพร
f04358bf-992d-4bb3-9f95-19f412457739	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-18	f	b0000000002	วัชนุภาพร
d617db9e-caba-4429-8fea-db8eef794cd3	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-25	f	b0000000002	วัชนุภาพร
62631177-1fc5-4f62-8a90-ae1698f7ff6a	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-01	f	b0000000002	วัชนุภาพร
0d06fdef-f919-4017-a087-96a809055149	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-08	f	b0000000002	วัชนุภาพร
d49d6c58-8897-4c44-8693-7c9d97137de5	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-15	f	b0000000002	วัชนุภาพร
4051eecf-0b57-4f73-9c74-0aef4b5475a5	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-22	f	b0000000002	วัชนุภาพร
2af2f23f-f4cd-4a82-b2e2-3c725232e464	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-29	f	b0000000002	วัชนุภาพร
bea5ec74-af2b-4ff5-9e74-da6cc8104fba	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-05	f	b0000000002	วัชนุภาพร
adb728be-dd84-4772-aa8b-a77ebf96e4ec	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-12	f	b0000000002	วัชนุภาพร
0734ce8d-dea5-44a5-9538-137f6f994d8f	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-19	f	b0000000002	วัชนุภาพร
15ff123d-88fe-4619-9ae4-a0e825e4ce5e	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-26	f	b0000000002	วัชนุภาพร
c22c9d9c-0751-4042-b7d3-6fdea2d434c6	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-03-05	f	b0000000002	วัชนุภาพร
7cb66186-7447-45cc-aa69-07768f637977	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-11-27	f	b0000000004	เป็นศิริ
04697a2d-ecdc-492f-9651-821ee1812156	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-04	f	b0000000004	เป็นศิริ
df14dbca-7a52-4a0b-bf8d-e5958cac5a29	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-11	f	b0000000004	เป็นศิริ
4317f67a-c4b7-4452-886b-d59cdee49d85	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-18	f	b0000000004	เป็นศิริ
1e35df8d-bccc-4f77-9df7-579d9d328d32	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-25	f	b0000000004	เป็นศิริ
a80172ab-148a-4c73-a1a3-1504f991cd31	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-01	f	b0000000004	เป็นศิริ
0a9395f0-e626-4706-b820-fe99ec31284b	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-08	f	b0000000004	เป็นศิริ
89490e76-1683-437a-9865-5c123e464449	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-15	f	b0000000004	เป็นศิริ
7ea1a909-2034-4f94-b635-c255844b8265	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-22	f	b0000000004	เป็นศิริ
d47069d8-a5f4-4e06-8f13-b1b74d6e6e13	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-29	f	b0000000004	เป็นศิริ
99260134-ca8a-4a84-8e90-57190d5408ee	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-05	f	b0000000004	เป็นศิริ
3cfed4c1-4469-44e8-b07e-f34861cceda8	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-12	f	b0000000004	เป็นศิริ
f059541e-18cf-4ad7-a044-7021961dac21	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-19	f	b0000000004	เป็นศิริ
ad2959c9-9390-49e4-b7ef-d99717d37fc9	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-26	f	b0000000004	เป็นศิริ
05d92a11-9044-4650-b9fb-d9b29c99ed57	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-03-05	f	b0000000004	เป็นศิริ
9ea89497-56dd-4c75-b6e0-4d86333ebb3c	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-03-03	f	b0000000005	คำประไพ
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
b0000000002	นาง	อรวรรณ	วัชนุภาพร	teacher	pongpak.te@gmail.com	2026-02-14 15:47:02.646935	t	f	\N
b0000000003	นาง	ชโลธร	ชูทอง	teacher	pongpak.te@gmail.com	2026-02-14 15:47:49.66541	f	t	\N
t009	นาง	df	ddsf	teacher	sdf@ku.th	2026-03-11 22:15:38.97494	f	t	\N
ไๆฟำๆไ	นาง	ำๆไำ	ๆไำๆไ	teacher	shjdflijs@ku.th	2026-03-11 22:20:28.987814	f	t	\N
b0000000001	นาง	จิรวรรณ	เจริญสุข	teacher	pongpak.te@gmail.com	2026-02-14 15:46:14.671934	f	t	\N
sdfsd	นาย	fsdf	sdfsd	teacher	fsdfsdW@ku.th	2026-03-11 22:20:57.309452	f	t	\N
b6630200403	นาย	Pongpak	Tepee	staff	pongpak.te@ku.th	2026-01-25 11:48:40.585447	t	t	39e3c7b4be040d83c47e
b6630200578	นาย	Supakrit	Seekum	staff	supakrit.se@ku.th	2026-01-25 11:48:40.585447	t	t	1501719acc8c68e50efb
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
-- TOC entry 2071 (class 826 OID 24657)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO project_app;


-- Completed on 2026-03-12 14:16:07

--
-- PostgreSQL database dump complete
--

\unrestrict uuFwlr3VJgT2ayuFyMFsZRz6EHBYZgFDVynfcfHC67ytKp4gBt8bHZBTfKpdRxt

