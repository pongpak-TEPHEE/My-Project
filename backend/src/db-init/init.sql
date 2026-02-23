-- CREATE TABLE IF NOT EXISTS public."Semesters" ( semester_id character varying NOT NULL PRIMARY KEY, year character varying NOT NULL, term smallint, start_date date, end_date date );
-- CREATE TABLE IF NOT EXISTS public."Rooms" ( room_id character varying NOT NULL PRIMARY KEY, room_type character varying, capacity integer, location character varying, room_characteristics character varying, repair boolean, is_active boolean );
-- CREATE TABLE IF NOT EXISTS public."Users" ( user_id character varying(20) NOT NULL PRIMARY KEY, title character varying(10), name character varying(50), surname character varying(50), role character varying(20), email character varying(50), created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP, is_verified boolean, is_active boolean );
-- CREATE TABLE IF NOT EXISTS public."OTP" ( request_id character varying NOT NULL PRIMARY KEY, email character varying, otp_code character varying, expired_at timestamp with time zone, created_at timestamp with time zone );
-- CREATE TABLE IF NOT EXISTS public."Equipment" ( equipment_id character varying NOT NULL PRIMARY KEY, room_id character varying NOT NULL REFERENCES public."Rooms"(room_id), computer integer, microphone integer, type_of_computer character varying, whiteboard integer, projector integer );
-- CREATE TABLE IF NOT EXISTS public."Schedules" ( schedule_id character varying NOT NULL PRIMARY KEY, room_id character varying NOT NULL REFERENCES public."Rooms"(room_id), subject_name character varying, teacher_name character varying, start_time time without time zone, end_time time without time zone, semester_id character varying REFERENCES public."Semesters"(semester_id), date date, temporarily_closed boolean, teacher_id character varying, teacher_surname character varying );
-- CREATE TABLE IF NOT EXISTS public."TokenBlacklist" ( token text NOT NULL PRIMARY KEY, expires_at timestamp without time zone NOT NULL );
-- CREATE TABLE IF NOT EXISTS public."Booking" ( booking_id character varying NOT NULL PRIMARY KEY, room_id character varying NOT NULL REFERENCES public."Rooms"(room_id), teacher_id character varying REFERENCES public."Users"(user_id), purpose character varying, date date, start_time time without time zone, end_time time without time zone, status character varying, approved_by character varying REFERENCES public."Users"(user_id) );



--
-- PostgreSQL database dump
--

\restrict WoB1vlX9UDoTQmeiNcVcG2VTkGYckwJEQpSMU530jMj3olakYjv4dbTAiEGK6za

-- Dumped from database version 17.7
-- Dumped by pg_dump version 17.7

-- Started on 2026-02-24 01:01:47

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
    is_active boolean
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
b0014	26506	b6630200578	555	2026-02-19	22:00:00	22:30:00	approved	b6630200578
b0015	26506	b6630200578	5555	2026-02-19	21:40:00	22:00:00	approved	b6630200578
b0016	26506	b6630200578	456	2026-02-19	22:40:00	23:00:00	approved	b6630200578
b0017	26506	b6630200578	852	2026-02-19	23:00:00	23:30:00	approved	b6630200578
b0018	26504	b6630200578	55555	2026-02-23	13:00:00	16:00:00	cancelled	b6630200578
b0019	26504	b6630200578	456	2026-02-23	13:00:00	16:00:00	cancelled	b6630200578
b0004	26508	b0000000001	8888	2026-02-20	09:00:00	12:00:00	rejected	\N
b0020	26504	b6630200578	456	2026-02-23	13:00:00	16:00:00	cancelled	b6630200578
b0002	26508	b0000000001	6666	2026-02-20	17:00:00	18:00:00	cancelled	\N
b0007	26506	b0000000001	5555	2026-02-25	16:00:00	17:00:00	rejected	b6630200578
b0003	26506	b0000000001	7777	2026-02-20	22:00:00	23:00:00	cancelled	\N
b0023	26504	b6630200578	555	2026-02-22	12:00:00	13:00:00	cancelled	b6630200578
b0024	26508	b6630200578	5555	2026-02-22	12:00:00	13:00:00	cancelled	b6630200578
a1a19685-9889-44ab-8e83-30185d41de06	26512	b6630200578	5555	2026-02-26	14:00:00	15:00:00	cancelled	\N
b0001	26506	b0000000001	7777	2026-02-10	15:30:00	16:30:00	approved	\N
b0008	26506	b0000000004	7777	2026-02-16	20:40:00	21:00:00	approved	\N
01898e4c-325a-4867-b95e-a3d413fad185	26504	b6630200578	555	2026-02-26	17:00:00	18:00:00	cancelled	\N
b0021	26504	b6630200578	444	2026-03-03	12:00:00	13:00:00	cancelled	b6630200578
b0022	26504	b6630200578	555	2026-02-24	09:00:00	18:00:00	cancelled	b6630200578
b0025	26504	b6630200578	555	2026-02-22	22:20:00	22:50:00	approved	b6630200578
b0005	26512	b0000000001	9999	2026-02-20	12:00:00	13:00:00	approved	b6630200578
b0009	26506	b0000000004	7777	2026-02-22	21:00:00	22:00:00	approved	b6630200578
b0011	26504	b6630200578	5555	2026-02-22	12:00:00	12:30:00	cancelled	\N
b0012	150411	b6630200578	6666	2026-02-23	12:30:00	13:30:00	cancelled	b6630200578
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
eq-150412	150412	50	1	PC	1	1
eq-150413	150413	50	1	PC	1	1
eq-150414	150414	50	1	PC	1	1
eq-150415	150415	50	1	PC	1	1
eq-SeniorProject	SeniorProject	0	0	PC	0	5
eq-555	555	0	0	PC	0	0
eq-5555	5555	6	6	VDI	6	6
eq-456	456	0	0	-	0	0
eq-150411	150411	0	0	-	0	0
eq-26504	26504	45	20	-	1	1
eq-150416	150416	0	0	-	0	0
\.


--
-- TOC entry 4942 (class 0 OID 16441)
-- Dependencies: 220
-- Data for Name: OTP; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OTP" (request_id, email, otp_code, expired_at, created_at) FROM stdin;
94fa1591-280e-46c7-8262-2752ed8c60ad	pongpak.te@ku.th	238451	2026-02-23 20:00:45.916+07	2026-02-23 19:55:45.92508+07
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
150411	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150412	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150413	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
26506	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
26508	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
26512	Computer lab	50	 อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	f	t
5555	666	66	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา	666	t	f
456		0	อาคาร 26 คณะวิทยาศาสตร์ ศรีราชา		t	f
150414	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150415	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
150416	Computer lab	50	 อาคาร 15 ปฏิบัติการวิทยาศาสตร์และเทคโนโลยี	สำหรับการเรียนการสอน และฝึกอบรมทางคอมพิวเตอร์เป็นหลัก	t	t
\.


--
-- TOC entry 4941 (class 0 OID 16424)
-- Dependencies: 219
-- Data for Name: Schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Schedules" (schedule_id, room_id, subject_name, teacher_name, start_time, end_time, semester_id, date, temporarily_closed, teacher_id, teacher_surname) FROM stdin;
ab500ab4-c2b5-4e8e-a687-f163c65b9f55	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-11-24	f	b0000000001	เจริญสุข
f0242d59-7de2-44ff-ab17-3b31e9cb2129	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-01	f	b0000000001	เจริญสุข
1f809b54-37be-41ff-b803-059017ad13ee	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-08	f	b0000000001	เจริญสุข
3ab27bfc-5cc4-4274-b71a-a5cee6b8fcc6	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-15	f	b0000000001	เจริญสุข
7193e555-e5d7-4865-923b-c5924f38bd3e	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-22	f	b0000000001	เจริญสุข
9d987fa8-621d-4305-be14-23af3dcd9f70	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2025-12-29	f	b0000000001	เจริญสุข
7f99e2a5-97d0-4d5e-870d-43db65fb8bad	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-05	f	b0000000001	เจริญสุข
1114c4b2-6577-4ea5-87cb-aebb6a5c327b	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-12	f	b0000000001	เจริญสุข
1bf670ca-4d90-4325-be41-177e133fdf33	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-19	f	b0000000001	เจริญสุข
de9fd9e5-fdb9-41bb-80cc-ccd71418db88	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-01-26	f	b0000000001	เจริญสุข
4626610a-5243-4ea7-9fb9-c950bf98a43f	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-09	f	b0000000001	เจริญสุข
6a9dfa61-36a5-47e5-bac0-96fae2749bfd	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-16	f	b0000000001	เจริญสุข
c95aa79e-1154-46da-899f-a5ef3a29fb27	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-23	f	b0000000001	เจริญสุข
a0f76998-5e83-4b6e-adce-5da5db8e1a77	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-03-02	f	b0000000001	เจริญสุข
fd689413-987f-47e2-8a5d-22ffc0e65685	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-11-25	f	b0000000005	คำประไพ
bbc2d3e1-e945-456a-aa57-7b57e0a8a948	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-02	f	b0000000005	คำประไพ
de706a5f-4566-4605-b434-275181754f8f	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-09	f	b0000000005	คำประไพ
7340761d-9ff4-4650-b8cb-72e227178667	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-16	f	b0000000005	คำประไพ
a046a971-fd73-4601-942f-58fe77d5db1b	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-23	f	b0000000005	คำประไพ
0f1e20fe-1bab-42b3-824a-00f182bb0461	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2025-12-30	f	b0000000005	คำประไพ
e8f3f314-27bf-4ab4-8325-f93c3b86e32d	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-06	f	b0000000005	คำประไพ
2491278b-c9c4-4576-a721-535ded8dbce0	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-13	f	b0000000005	คำประไพ
e92f35b7-bddc-40cb-8f69-0a09adef3298	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-20	f	b0000000005	คำประไพ
b0e73ed6-9fd8-4820-a5fd-ad68b7172892	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-01-27	f	b0000000005	คำประไพ
2f5fc8d6-ecbb-49fa-8cea-5f2cebb81ff1	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-03	f	b0000000005	คำประไพ
6e5393e6-beaf-41f7-81f1-07976c2b952a	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-10	f	b0000000005	คำประไพ
d393cb51-586f-4129-820d-8d57d7d90a4c	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-17	f	b0000000005	คำประไพ
70ffa003-a449-463f-a7b8-d5e827bdaf21	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-02-24	f	b0000000005	คำประไพ
d565aaf3-e11c-4caa-9a4b-9ab2aacdc31a	26506	Mobile Application Design and Development (บรรยาย)	วนิดา	13:00:00	15:00:00	2025/2	2026-03-03	f	b0000000005	คำประไพ
2972982e-8eb5-4752-afc2-462eec1cbff7	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-11-25	f	b0000000005	คำประไพ
e9a05531-489c-4c4c-a700-97425a0833ba	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-02	f	b0000000005	คำประไพ
2ea7b24d-e317-4d53-99f9-c5160febdcaa	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-09	f	b0000000005	คำประไพ
aa20a0b1-8af7-4368-866c-0baa036f8059	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-16	f	b0000000005	คำประไพ
f2f07cf7-22b8-4550-815b-f1c08cbc45c7	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-23	f	b0000000005	คำประไพ
7a54062b-d133-4acc-8de7-a486a969d621	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2025-12-30	f	b0000000005	คำประไพ
e570a53c-598f-478e-bb90-b29c474883e1	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-06	f	b0000000005	คำประไพ
7141dc61-9f1f-4cfe-85cc-373a1e565724	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-13	f	b0000000005	คำประไพ
a57d017f-36c1-41d5-abb1-1fefed0f9a30	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-20	f	b0000000005	คำประไพ
095bc316-bad0-450f-8b3a-35f27f8b6364	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-01-27	f	b0000000005	คำประไพ
5640445a-ab22-448c-83e9-00fc8cd85c8d	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-03	f	b0000000005	คำประไพ
a2f4bbff-a590-431a-8052-7b17d018ef73	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-10	f	b0000000005	คำประไพ
a9aac0f6-1ed3-4362-8ee5-8c764e129bb0	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-17	f	b0000000005	คำประไพ
81d39c89-616e-436d-b579-15589531cd8d	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-02-24	f	b0000000005	คำประไพ
5c876adc-2edd-4e3f-ade4-7e70a5d3f646	26506	Mobile Application Design and Development (ปฎิบัติ)	วนิดา	15:00:00	17:00:00	2025/2	2026-03-03	f	b0000000005	คำประไพ
5e79d9b1-e1d6-410b-b702-20d1f454f04a	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-11-26	f	b0000000002	วัชนุภาพร
1fc0d604-b926-4a9a-8657-f4e851d52b70	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-03	f	b0000000002	วัชนุภาพร
2deea5e3-ad9d-4884-91ed-98eeab987744	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-10	f	b0000000002	วัชนุภาพร
f826a600-279c-44c0-a9ad-e8417c01179f	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-17	f	b0000000002	วัชนุภาพร
db402298-02ca-4892-9197-273c6393eee1	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-24	f	b0000000002	วัชนุภาพร
d4b16759-a93f-48af-aa65-cc74457cb836	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2025-12-31	f	b0000000002	วัชนุภาพร
1051a826-3f56-4138-a499-993a90f23e65	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-07	f	b0000000002	วัชนุภาพร
79512ccc-4261-429d-a3b0-a4d02945ddf9	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-14	f	b0000000002	วัชนุภาพร
85d00f5f-220a-4044-96b6-e69e2d583446	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-21	f	b0000000002	วัชนุภาพร
f4f7907b-8951-4289-ba80-d5a7ece80a48	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-01-28	f	b0000000002	วัชนุภาพร
53574a2b-7a21-4d31-8752-39f756599157	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-04	f	b0000000002	วัชนุภาพร
56134733-39f7-464a-9341-883173ab8a2e	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-11	f	b0000000002	วัชนุภาพร
7965bb2e-46d1-4f68-85b5-a02dbfcb5bfc	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-18	f	b0000000002	วัชนุภาพร
9e764c40-8611-46b2-bf34-d9b235895baa	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-02-25	f	b0000000002	วัชนุภาพร
76d2c3cf-40d3-4ed2-bae2-6538ea61a7e3	26504	Theory of Computation	อรวรรณ	13:00:00	16:00:00	2025/2	2026-03-04	f	b0000000002	วัชนุภาพร
89eda6b2-7b78-42ba-9c6e-0026430359b6	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-11-26	f	b0000000003	ชูทอง
5df7a083-8748-4be3-b3fe-044d080b0f25	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-03	f	b0000000003	ชูทอง
43f0adeb-c4dd-4f8f-aa14-c05869595046	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-10	f	b0000000003	ชูทอง
1d8b0e19-5c92-4fc2-be3a-dfa913a92151	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-17	f	b0000000003	ชูทอง
2ac10bb0-3dc8-44b2-a9d2-b9897981171d	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-24	f	b0000000003	ชูทอง
cd8a76ad-5c0a-4c19-b0a0-2c2f9ddcb5b0	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2026-12-31	f	b0000000003	ชูทอง
19b53af4-0990-4dd6-8713-160431f2e94b	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-07	f	b0000000003	ชูทอง
b3beb844-359a-4a48-8255-3691ace85a8a	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-14	f	b0000000003	ชูทอง
ea20a86f-5212-451f-9b5b-d4a463c28dc5	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-21	f	b0000000003	ชูทอง
27a0d23c-0087-4107-8374-68ca61cec202	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-01-28	f	b0000000003	ชูทอง
c1c78002-bfe2-4010-a401-821e476a4617	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-04	f	b0000000003	ชูทอง
b5bf1f7e-1e50-4293-9e2b-a79e10ff8d3d	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-11	f	b0000000003	ชูทอง
f547fec4-9623-42a1-a7ad-2d790384619a	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-18	f	b0000000003	ชูทอง
e0dcb7b0-8fb8-4f2a-a020-f37cb13b92d2	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-02-25	f	b0000000003	ชูทอง
aae7d5e3-69dd-4776-b097-56c1367bf424	26504	Cooperative Education Preparation	ชโลธร	08:30:00	10:30:00	2025/2	2027-03-04	f	b0000000003	ชูทอง
2762f1a1-4c5a-4eda-bd2f-efba855605b0	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-11-26	f	b0000000004	เป็นศิริ
2dddf0cf-2558-4e99-9f8c-cf0d7dac8f94	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-03	f	b0000000004	เป็นศิริ
1f582bea-c514-4786-99c5-4ab3da0b6d7d	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-10	f	b0000000004	เป็นศิริ
a554f960-507d-4efb-9f4e-5e6143d2f198	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-17	f	b0000000004	เป็นศิริ
8ec932b9-c89c-4dee-a247-bf2144985117	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-24	f	b0000000004	เป็นศิริ
50072ee3-359f-4e5c-89d3-cc066db1c9bc	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2026-12-31	f	b0000000004	เป็นศิริ
d8efa133-70ce-4eeb-a0c8-9d08bc4e3ee1	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-07	f	b0000000004	เป็นศิริ
3b3b0346-5b6d-4609-b40a-32e83d8162b1	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-14	f	b0000000004	เป็นศิริ
9e6bc79c-7863-4fc0-baf5-f2aac15455f1	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-21	f	b0000000004	เป็นศิริ
fddbb1ca-8126-4ad9-955a-d245466ed8f1	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-01-28	f	b0000000004	เป็นศิริ
14f96de9-c50b-4626-8a13-373526874320	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-04	f	b0000000004	เป็นศิริ
3e0f5900-6502-4639-ba8a-66e2f4dcf204	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-11	f	b0000000004	เป็นศิริ
40e114b4-a1d4-46ad-926d-101a7056dc68	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-18	f	b0000000004	เป็นศิริ
f2c9354b-9a12-4f04-aa96-9196dff599c9	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-02-25	f	b0000000004	เป็นศิริ
f7aad2bf-9ee2-4266-86f1-fb3925ce1e69	26512	Information System Security	เฟื่องฟ้า	13:00:00	16:00:00	2025/2	2027-03-04	f	b0000000004	เป็นศิริ
77b231df-00c8-4973-aedd-b4700f7a751c	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-11-27	f	b0000000002	วัชนุภาพร
a48bd123-6a51-47c4-91ab-5c5a472ce20d	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-04	f	b0000000002	วัชนุภาพร
f5905632-ef97-45e2-8c71-9834c5a03abf	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-11	f	b0000000002	วัชนุภาพร
89aeaf7b-71f9-45b9-be63-07a2348ad7e2	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-18	f	b0000000002	วัชนุภาพร
2cf2330d-e5b4-46a3-afc8-8eef4ece76ea	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2026-12-25	f	b0000000002	วัชนุภาพร
1e7dc64b-ae9c-464a-80f5-82e468894582	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-01	f	b0000000002	วัชนุภาพร
60067cda-1d9e-4749-9a5e-10740f56c8e8	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-08	f	b0000000002	วัชนุภาพร
f6c43d9d-c05c-409c-b07b-f17bcc798b81	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-15	f	b0000000002	วัชนุภาพร
c4292c5b-6638-4df8-816f-20209446b824	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-22	f	b0000000002	วัชนุภาพร
5d7be79f-039e-493e-a565-5e261263a958	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-01-29	f	b0000000002	วัชนุภาพร
8f175689-d25f-4330-bd45-589e7756ef02	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-05	f	b0000000002	วัชนุภาพร
82bc6c82-8cc8-4cfc-aa87-d70d9f7621bb	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-12	f	b0000000002	วัชนุภาพร
001261ef-a0c6-4408-9b65-4a2f8fd6e9af	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-19	f	b0000000002	วัชนุภาพร
46781c38-bd64-4588-9659-41f2d18be650	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-02-26	f	b0000000002	วัชนุภาพร
6549c18d-61ea-4708-b855-7433f769a652	26508	Web Technology and Web Services (บรรยาย)	อรวรรณ	08:30:00	10:30:00	2025/2	2027-03-05	f	b0000000002	วัชนุภาพร
628a55bb-0224-4d8c-8dd8-7b948ccc1b0d	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-11-27	f	b0000000004	เป็นศิริ
433e9796-9a77-4b8b-aa66-fbde888cc008	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-04	f	b0000000004	เป็นศิริ
a43afb62-2c04-4566-a2ef-dfb8ae1bbb59	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-11	f	b0000000004	เป็นศิริ
4ba1e971-f8dd-4bbc-98f6-4bb7c883eb9f	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-18	f	b0000000004	เป็นศิริ
3f304abd-f1f5-43a2-9e22-b6083b8339da	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2026-12-25	f	b0000000004	เป็นศิริ
99b77cff-09c4-4dbb-be03-395e12362c77	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-01	f	b0000000004	เป็นศิริ
a676aac9-3702-426f-9b6a-d381977a99f7	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-08	f	b0000000004	เป็นศิริ
72b0cd27-3d02-4887-931e-844d32551e62	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-15	f	b0000000004	เป็นศิริ
17339fdf-4bac-4c80-b34a-093f9027a9fe	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-22	f	b0000000004	เป็นศิริ
5bba5f44-5f3d-4b41-834d-e34a752bf5e8	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-01-29	f	b0000000004	เป็นศิริ
71e36160-7d00-4ebd-a1ad-3454e72c0d36	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-05	f	b0000000004	เป็นศิริ
b32b20ef-5bf9-4f44-a82e-262e127cb5cc	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-12	f	b0000000004	เป็นศิริ
cd794ce1-c04f-47c6-8f66-ead38711ee3b	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-19	f	b0000000004	เป็นศิริ
ae3f20b9-4dd5-498b-aec6-ce26f5324a4a	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-02-26	f	b0000000004	เป็นศิริ
90179833-9e10-41b1-bf6c-838d811a6b37	26508	Web Technology and Web Services (ปฎิบัติ)	เฟื่องฟ้า	10:30:00	12:00:00	2025/2	2027-03-05	f	b0000000004	เป็นศิริ
c6e6c289-9bab-4193-bbe4-e8f6b026f0d4	26504	Natural Language Processing	จิรวรรณ	13:00:00	16:00:00	2025/2	2026-02-02	f	b0000000001	เจริญสุข
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

COPY public."Users" (user_id, title, name, surname, role, email, created_at, is_verified, is_active) FROM stdin;
b0000000002	นาง	อรวรรณ	วัชนุภาพร	teacher	pongpak.te@gmail.com	2026-02-14 15:47:02.646935	t	t
b0000000003	นาง	ชโลธร	ชูทอง	teacher	pongpak.te@gmail.com	2026-02-14 15:47:49.66541	t	t
b0000000004	นาง	เฟื่องฟ้า	เป็นศิริ	teacher	pongpak.te@gmail.com	2026-02-14 15:49:35.888173	t	t
b0000000005	นาง	วนิดา	คำประไพ	teacher	pongpak.te@gmail.com	2026-02-14 20:04:56.336633	t	t
b0000000001	นาง	จิรวรรณ	เจริญสุข	teacher	pongpak.te@gmail.com	2026-02-14 15:46:14.671934	f	t
T001	นาย	ศรีสมชัย	ภารี	teacher	Te.te@ku.th	2026-02-22 20:19:48.168474	f	t
b6630200578	นาย	Supakrit	Seekum	staff	supakrit.se@ku.th	2026-01-25 11:48:40.585447	t	t
b6630200403	นาย	Pongpak	Tepee	staff	pongpak.te@ku.th	2026-01-25 11:48:40.585447	t	t
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


-- Completed on 2026-02-24 01:01:47

--
-- PostgreSQL database dump complete
--

\unrestrict WoB1vlX9UDoTQmeiNcVcG2VTkGYckwJEQpSMU530jMj3olakYjv4dbTAiEGK6za

