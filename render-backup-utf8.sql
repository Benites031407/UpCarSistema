--
-- PostgreSQL database dump
--

\restrict oOswdOcbqHhaFiic120gRGOa3MzQBjwXmJIyP7P4n7oGwEbQpTp3Y49WtUxcMnC

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = NOW();

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: machines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.machines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(6) NOT NULL,
    qr_code text NOT NULL,
    location character varying(255) NOT NULL,
    controller_id character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'offline'::character varying,
    operating_hours_start time without time zone DEFAULT '08:00:00'::time without time zone NOT NULL,
    operating_hours_end time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL,
    maintenance_interval integer DEFAULT 100 NOT NULL,
    current_operating_minutes integer DEFAULT 0 NOT NULL,
    temperature numeric(5,2),
    last_heartbeat timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    price_per_minute numeric(10,2) DEFAULT 1.00 NOT NULL,
    max_duration_minutes integer DEFAULT 30 NOT NULL,
    power_consumption_watts integer DEFAULT 1200 NOT NULL,
    kwh_rate numeric(10,4) DEFAULT 0.65 NOT NULL,
    last_cleaning_date timestamp with time zone,
    last_maintenance_date timestamp with time zone,
    location_owner_quota numeric(5,2) DEFAULT 50.00 NOT NULL,
    maintenance_override boolean DEFAULT false NOT NULL,
    maintenance_override_reason text,
    maintenance_override_at timestamp with time zone,
    maintenance_override_by character varying(255),
    operational_cost_quota numeric(5,2) DEFAULT 10.00,
    city character varying(100),
    CONSTRAINT machines_code_format_check CHECK (((code)::text ~ '^[0-9]{1,6}$'::text)),
    CONSTRAINT machines_kwh_rate_check CHECK ((kwh_rate > (0)::numeric)),
    CONSTRAINT machines_location_owner_quota_check CHECK (((location_owner_quota >= (0)::numeric) AND (location_owner_quota <= (100)::numeric))),
    CONSTRAINT machines_maintenance_interval_check CHECK ((maintenance_interval > 0)),
    CONSTRAINT machines_max_duration_minutes_check CHECK (((max_duration_minutes >= 1) AND (max_duration_minutes <= 120))),
    CONSTRAINT machines_operating_hours_check CHECK ((current_operating_minutes >= 0)),
    CONSTRAINT machines_operational_cost_quota_check CHECK (((operational_cost_quota >= (0)::numeric) AND (operational_cost_quota <= (100)::numeric))),
    CONSTRAINT machines_power_consumption_watts_check CHECK ((power_consumption_watts > 0)),
    CONSTRAINT machines_price_per_minute_check CHECK ((price_per_minute > (0)::numeric)),
    CONSTRAINT machines_status_check CHECK (((status)::text = ANY (ARRAY[('online'::character varying)::text, ('offline'::character varying)::text, ('maintenance'::character varying)::text, ('in_use'::character varying)::text]))),
    CONSTRAINT machines_temperature_check CHECK (((temperature IS NULL) OR ((temperature >= ('-50'::integer)::numeric) AND (temperature <= (100)::numeric))))
);


ALTER TABLE public.machines OWNER TO postgres;

--
-- Name: COLUMN machines.code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.code IS 'Machine code: 1-6 digits only (e.g., 123456)';


--
-- Name: COLUMN machines.current_operating_minutes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.current_operating_minutes IS 'Total operating time in minutes';


--
-- Name: COLUMN machines.price_per_minute; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.price_per_minute IS 'Price charged per minute of usage in BRL';


--
-- Name: COLUMN machines.max_duration_minutes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.max_duration_minutes IS 'Maximum allowed usage duration in minutes (1-120)';


--
-- Name: COLUMN machines.power_consumption_watts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.power_consumption_watts IS 'Power consumption of the machine in watts';


--
-- Name: COLUMN machines.kwh_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.kwh_rate IS 'Cost per kilowatt-hour in BRL';


--
-- Name: COLUMN machines.last_cleaning_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.last_cleaning_date IS 'Date of last cleaning maintenance';


--
-- Name: COLUMN machines.last_maintenance_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.last_maintenance_date IS 'Date of last maintenance of any type';


--
-- Name: COLUMN machines.location_owner_quota; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.location_owner_quota IS 'Percentage of net revenue allocated to location owner (0-100)';


--
-- Name: COLUMN machines.maintenance_override; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.maintenance_override IS 'When true, machine can operate despite exceeding maintenance interval';


--
-- Name: COLUMN machines.maintenance_override_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.maintenance_override_reason IS 'Reason for overriding maintenance requirement';


--
-- Name: COLUMN machines.maintenance_override_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.maintenance_override_at IS 'Timestamp when override was activated';


--
-- Name: COLUMN machines.maintenance_override_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.maintenance_override_by IS 'Admin who activated the override';


--
-- Name: COLUMN machines.operational_cost_quota; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.operational_cost_quota IS 'Percentage (0-100) of revenue allocated to operational costs';


--
-- Name: COLUMN machines.city; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.machines.city IS 'City where the machine is located';


--
-- Name: maintenance_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.maintenance_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    machine_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    performed_by uuid,
    description text,
    cost numeric(10,2),
    parts_replaced text[],
    next_maintenance_due timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT maintenance_logs_type_check CHECK (((type)::text = ANY (ARRAY[('cleaning'::character varying)::text, ('repair'::character varying)::text, ('inspection'::character varying)::text, ('part_replacement'::character varying)::text, ('other'::character varying)::text])))
);


ALTER TABLE public.maintenance_logs OWNER TO postgres;

--
-- Name: TABLE maintenance_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.maintenance_logs IS 'Log of all maintenance activities performed on machines';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type character varying(30) NOT NULL,
    machine_id uuid,
    message text NOT NULL,
    whatsapp_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY (ARRAY[('maintenance_required'::character varying)::text, ('machine_offline'::character varying)::text, ('system_error'::character varying)::text]))),
    CONSTRAINT notifications_whatsapp_status_check CHECK (((whatsapp_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text, ('failed'::character varying)::text])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(30) NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_id character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT transactions_payment_method_check CHECK (((payment_method)::text = ANY (ARRAY[('pix'::character varying)::text, ('admin_credit'::character varying)::text]))),
    CONSTRAINT transactions_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT transactions_type_check CHECK (((type)::text = ANY (ARRAY[('credit_added'::character varying)::text, ('usage_payment'::character varying)::text, ('subscription_payment'::character varying)::text])))
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: usage_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    machine_id uuid NOT NULL,
    duration integer NOT NULL,
    cost numeric(10,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    payment_id character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usage_sessions_cost_check CHECK ((cost > (0)::numeric)),
    CONSTRAINT usage_sessions_duration_check CHECK (((duration >= 1) AND (duration <= 30))),
    CONSTRAINT usage_sessions_payment_method_check CHECK (((payment_method)::text = ANY (ARRAY[('balance'::character varying)::text, ('pix'::character varying)::text]))),
    CONSTRAINT usage_sessions_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('active'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT usage_sessions_time_check CHECK (((start_time IS NULL) OR (end_time IS NULL) OR (end_time > start_time)))
);


ALTER TABLE public.usage_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    google_id character varying(255),
    password_hash character varying(255),
    account_balance numeric(10,2) DEFAULT 0.00 NOT NULL,
    subscription_status character varying(20) DEFAULT 'none'::character varying,
    subscription_expiry timestamp with time zone,
    last_daily_use date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role character varying(20) DEFAULT 'customer'::character varying NOT NULL,
    CONSTRAINT users_auth_check CHECK (((google_id IS NOT NULL) OR (password_hash IS NOT NULL))),
    CONSTRAINT users_balance_check CHECK ((account_balance >= (0)::numeric)),
    CONSTRAINT users_email_check CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('customer'::character varying)::text, ('admin'::character varying)::text]))),
    CONSTRAINT users_subscription_status_check CHECK (((subscription_status)::text = ANY (ARRAY[('none'::character varying)::text, ('active'::character varying)::text, ('expired'::character varying)::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: machines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.machines (id, code, qr_code, location, controller_id, status, operating_hours_start, operating_hours_end, maintenance_interval, current_operating_minutes, temperature, last_heartbeat, created_at, updated_at, price_per_minute, max_duration_minutes, power_consumption_watts, kwh_rate, last_cleaning_date, last_maintenance_date, location_owner_quota, maintenance_override, maintenance_override_reason, maintenance_override_at, maintenance_override_by, operational_cost_quota, city) FROM stdin;
0601f2c7-9d21-4b20-91cd-d3bc87c40c8e	842609	PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNyAzNyIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMCAwaDM3djM3SDB6Ii8+PHBhdGggc3Ryb2tlPSIjMDAwMDAwIiBkPSJNNCA0LjVoN20yIDBoMm00IDBoNm0xIDBoN000IDUuNWgxbTUgMGgxbTIgMGgybTkgMGgxbTEgMGgxbTUgMGgxTTQgNi41aDFtMSAwaDNtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMiAwaDJtMSAwaDFtMSAwaDNtMSAwaDFNNCA3LjVoMW0xIDBoM20xIDBoMW0xIDBoMW0xIDBoMm01IDBoMW0xIDBoMW0yIDBoMW0xIDBoM20xIDBoMU00IDguNWgxbTEgMGgzbTEgMGgxbTEgMGg0bTEgMGgzbTIgMGgybTIgMGgxbTEgMGgzbTEgMGgxTTQgOS41aDFtNSAwaDFtMSAwaDJtMyAwaDNtMiAwaDFtMyAwaDFtNSAwaDFNNCAxMC41aDdtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDdNMTIgMTEuNWgxbTEgMGgxbTEgMGgybTEgMGgxTTQgMTIuNWgxbTEgMGg1bTIgMGg0bTEgMGgybTEgMGgxbTIgMGgxbTEgMGg1TTQgMTMuNWgxbTEgMGgxbTIgMGgxbTMgMGg0bTIgMGgybTEgMGgybTEgMGg0bTMgMGgxTTQgMTQuNWg0bTEgMGg1bTUgMGgxbTEgMGgybTIgMGgybTEgMGgxTTQgMTUuNWg2bTEgMGgxbTEgMGgxbTEgMGgybTEgMGgybTUgMGgxbTEgMGgxbTMgMGgxTTYgMTYuNWgybTIgMGgybTQgMGgxbTMgMGgybTIgMGgxbTQgMGgyTTYgMTcuNWgzbTMgMGgzbTEgMGg0bTEgMGgzbTEgMGg0bTEgMGgxbTEgMGgxTTQgMTguNWgybTEgMGgybTEgMGg0bTEgMGg0bTMgMGgxbTMgMGgzbTEgMGgxTTUgMTkuNWgxbTMgMGgxbTEgMGgxbTEgMGgybTEgMGgybTQgMGgxbTMgMGgxbTEgMGgxbTIgMGgxTTQgMjAuNWgzbTMgMGgxbTQgMGgxbTIgMGgxbTIgMGgxbTIgMGgxbTUgMGgxTTQgMjEuNWgybTEgMGgxbTEgMGgxbTIgMGgybTUgMGg1bTIgMGg1bTEgMGgxTTQgMjIuNWgxbTIgMGgxbTIgMGgzbTYgMGgybTEgMGgxbTEgMGgybTEgMGgxbTEgMGgyTTQgMjMuNWgxbTEgMGgzbTIgMGgxbTEgMGgxbTEgMGgxbTIgMGgxbTQgMGgxbTIgMGgxbTEgMGgxbTIgMGgxTTQgMjQuNWgxbTIgMGgybTEgMGgxbTIgMGg0bTMgMGgybTIgMGg1bTEgMGgzTTEyIDI1LjVoMW00IDBoM20xIDBoNG0zIDBoNU00IDI2LjVoN20zIDBoMW0yIDBoM20xIDBoMW0xIDBoMm0xIDBoMW0xIDBoM000IDI3LjVoMW01IDBoMW0xIDBoNG0xIDBoMW0xIDBoMW0yIDBoMW0xIDBoMW0zIDBoMm0xIDBoMk00IDI4LjVoMW0xIDBoM20xIDBoMW0xIDBoMW0yIDBoMW0yIDBoNG0yIDBoNW0xIDBoMW0xIDBoMU00IDI5LjVoMW0xIDBoM20xIDBoMW0xIDBoNW0yIDBoMW0yIDBoMW0xIDBoMW00IDBoMk00IDMwLjVoMW0xIDBoM20xIDBoMW0xIDBoMW0yIDBoM20xIDBoMm0zIDBoMW0xIDBoM20yIDBoMU00IDMxLjVoMW01IDBoMW0zIDBoNG0yIDBoMW0yIDBoMm0yIDBoMW0xIDBoMW0xIDBoMU00IDMyLjVoN20xIDBoMW0yIDBoMm0xIDBoMW0yIDBoMm0yIDBoMW0xIDBoMW0yIDBoMSIvPjwvc3ZnPgo=	Av. S??o Lu??s 840 - Guarulhos	Raspberry-pi-04	online	00:01:00	23:59:00	100	2	\N	2025-12-15 01:45:06.51+00	2025-12-13 02:55:53.502187+00	2025-12-15 01:45:06.51121+00	1.00	30	1200	0.6500	\N	\N	50.00	f	\N	\N	\N	10.00	Guarulhos
c5530a32-e9a9-40cc-a227-2f2c1504dc74	483921	PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNyAzNyIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMCAwaDM3djM3SDB6Ii8+PHBhdGggc3Ryb2tlPSIjMDAwMDAwIiBkPSJNNCA0LjVoN20yIDBoMW0xIDBoMW0zIDBoNm0xIDBoN000IDUuNWgxbTUgMGgxbTMgMGgxbTkgMGgxbTEgMGgxbTUgMGgxTTQgNi41aDFtMSAwaDNtMSAwaDFtMSAwaDFtMSAwaDFtMyAwaDFtMSAwaDFtMiAwaDJtMSAwaDFtMSAwaDNtMSAwaDFNNCA3LjVoMW0xIDBoM20xIDBoMW0xIDBoMW0yIDBoMW01IDBoMW0xIDBoMW0yIDBoMW0xIDBoM20xIDBoMU00IDguNWgxbTEgMGgzbTEgMGgxbTEgMGgxbTQgMGgzbTIgMGgybTIgMGgxbTEgMGgzbTEgMGgxTTQgOS41aDFtNSAwaDFtMSAwaDRtMSAwaDNtMiAwaDFtMyAwaDFtNSAwaDFNNCAxMC41aDdtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDdNMTIgMTEuNWgxbTEgMGg0bTEgMGgxTTQgMTIuNWgxbTEgMGg1bTQgMGgxbTIgMGgybTEgMGgxbTIgMGgxbTEgMGg1TTQgMTMuNWgxbTIgMGgzbTIgMGgxbTIgMGgxbTMgMGgybTEgMGgybTEgMGg0bTMgMGgxTTQgMTQuNWgxMG0yIDBoMW0yIDBoMW0xIDBoMm0yIDBoMm0xIDBoMU00IDE1LjVoMm0xIDBoM20xIDBoMW0xIDBoMW00IDBoMW0xIDBoMW00IDBoMW0xIDBoMW0zIDBoMU00IDE2LjVoMW0yIDBoMW0yIDBoMm0xIDBoM20zIDBoMW0xIDBoMW0yIDBoMW00IDBoMk00IDE3LjVoMW02IDBoMm0zIDBoM20xIDBoNG0xIDBoNG0xIDBoMW0xIDBoMU03IDE4LjVoNW0xIDBoMW0zIDBoMm0xIDBoMW0xIDBoMW0zIDBoM20xIDBoMU00IDE5LjVoMm0zIDBoMW0xIDBoMW0yIDBoMm0xIDBoMW00IDBoMW0zIDBoMW0xIDBoMW0yIDBoMU01IDIwLjVoM20yIDBoMW0xIDBoMm0xIDBoMm0xIDBoMm0xIDBoMW0yIDBoMW01IDBoMU00IDIxLjVoMW0xNSAwaDRtMiAwaDVtMSAwaDFNNCAyMi41aDFtMyAwaDNtMSAwaDFtMiAwaDFtNCAwaDFtMSAwaDFtMSAwaDJtMSAwaDFtMSAwaDJNNCAyMy41aDFtMSAwaDNtNSAwaDNtMSAwaDJtMyAwaDFtMiAwaDFtMSAwaDFtMiAwaDFNNCAyNC41aDFtMSAwaDJtMSAwaDJtMyAwaDNtMyAwaDJtMiAwaDVtMSAwaDNNMTIgMjUuNWgybTIgMGg0bTEgMGg0bTMgMGg1TTQgMjYuNWg3bTMgMGg2bTEgMGgxbTEgMGgybTEgMGgxbTEgMGgzTTQgMjcuNWgxbTUgMGgxbTEgMGgzbTEgMGgybTEgMGgxbTIgMGgxbTEgMGgxbTMgMGgybTEgMGgyTTQgMjguNWgxbTEgMGgzbTEgMGgxbTEgMGgybTEgMGgxbTIgMGg0bTIgMGg1bTEgMGgxbTEgMGgxTTQgMjkuNWgxbTEgMGgzbTEgMGgxbTEgMGgxbTMgMGgxbTIgMGgxbTIgMGgxbTEgMGgxbTQgMGgyTTQgMzAuNWgxbTEgMGgzbTEgMGgxbTEgMGgxbTEgMGgxbTQgMGgybTMgMGgxbTEgMGgzbTIgMGgxTTQgMzEuNWgxbTUgMGgxbTYgMGgybTEgMGgxbTIgMGgybTIgMGgxbTEgMGgxbTEgMGgxTTQgMzIuNWg3bTEgMGgxbTEgMGgybTUgMGgybTIgMGgxbTEgMGgxbTIgMGgxIi8+PC9zdmc+Cg==	Av. Portugal 1756 - Santo Andr??	Raspberry-pi-01	online	00:01:00	23:59:00	100	2	\N	2025-12-15 01:45:20.688+00	2025-12-13 02:50:04.046509+00	2025-12-15 01:45:20.689182+00	1.00	30	1200	0.6500	\N	\N	50.00	f	\N	\N	\N	10.00	Santo Andr??
1a4493bf-293b-49dc-9dc8-f84808034e4b	196537	PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNyAzNyIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMCAwaDM3djM3SDB6Ii8+PHBhdGggc3Ryb2tlPSIjMDAwMDAwIiBkPSJNNCA0LjVoN20yIDBoMm0xIDBoMW0xIDBoMW0yIDBoM20yIDBoN000IDUuNWgxbTUgMGgxbTIgMGgxbTYgMGgzbTEgMGgxbTEgMGgxbTUgMGgxTTQgNi41aDFtMSAwaDNtMSAwaDFtMyAwaDNtMSAwaDJtMSAwaDFtMSAwaDJtMSAwaDFtMSAwaDNtMSAwaDFNNCA3LjVoMW0xIDBoM20xIDBoMW0yIDBoMW0xIDBoM200IDBoMW0zIDBoMW0xIDBoM20xIDBoMU00IDguNWgxbTEgMGgzbTEgMGgxbTIgMGgxbTEgMGgybTUgMGgxbTEgMGgxbTEgMGgxbTEgMGgzbTEgMGgxTTQgOS41aDFtNSAwaDFtMSAwaDFtMSAwaDJtMyAwaDFtMyAwaDJtMSAwaDFtNSAwaDFNNCAxMC41aDdtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDdNMTMgMTEuNWgzbTEgMGgxbTEgMGg0TTQgMTIuNWgxbTIgMGgxbTEgMGgybTEgMGgxbTEgMGgzbTEgMGgxbTEgMGgxbTMgMGgybTEgMGgxTTcgMTMuNWgzbTMgMGgybTEgMGgybTEgMGgzbTMgMGgybTIgMGgxbTIgMGgxTTUgMTQuNWg0bTEgMGgxbTEgMGgxbTEgMGgxbTIgMGgybTIgMGg0bTEgMGgxbTEgMGg0TTUgMTUuNWgxbTIgMGgybTMgMGgxbTEgMGgzbTIgMGgxbTEgMGg0bTEgMGg1TTQgMTYuNWgybTEgMGgybTEgMGgzbTEgMGgybTIgMGgxbTEgMGgybTMgMGgybTIgMGgxbTEgMGgyTTQgMTcuNWgybTMgMGgxbTIgMGgxbTIgMGg2bTIgMGgxbTEgMGgxbTQgMGgxTTQgMTguNWgxbTEgMGgxbTMgMGgybTEgMGgzbTEgMGg2bTIgMGgxbTIgMGgxbTEgMGgzTTUgMTkuNWgxbTEgMGgybTIgMGgxbTEgMGgxbTEgMGgxbTMgMGgzbTEgMGgxbTIgMGgybTEgMGgxbTEgMGgxTTQgMjAuNWgxbTEgMGgybTIgMGgzbTEgMGgxbTEgMGgybTMgMGgxbTEgMGgxbTEgMGgxbTMgMGgxbTEgMGgxTTYgMjEuNWg0bTEgMGg1bTEgMGg1bTIgMGgxbTEgMGgybTQgMGgxTTQgMjIuNWgxbTEgMGgxbTEgMGg3bTMgMGgzbTEgMGgxbTMgMGgybTEgMGgxbTEgMGgyTTggMjMuNWgybTEgMGgxbTMgMGgxbTIgMGg2bTMgMGgxbTMgMGgyTTQgMjQuNWgxbTEgMGg4bTEgMGgxbTMgMGgxbTQgMGg1bTEgMGgxTTEyIDI1LjVoMW0yIDBoMW0yIDBoMm00IDBoMW0zIDBoMW0xIDBoM000IDI2LjVoN20yIDBoNG00IDBoMW0yIDBoMW0xIDBoMW0xIDBoMW0yIDBoMU00IDI3LjVoMW01IDBoMW0xIDBoMW0zIDBoMW0xIDBoMm0zIDBoMm0zIDBoMW0xIDBoM000IDI4LjVoMW0xIDBoM20xIDBoMW00IDBoMm00IDBoMW0yIDBoNW0yIDBoMU00IDI5LjVoMW0xIDBoM20xIDBoMW0xIDBoMW0xIDBoM20yIDBoM20yIDBoMW0xIDBoNW0xIDBoMU00IDMwLjVoMW0xIDBoM20xIDBoMW0yIDBoNG00IDBoMW0yIDBoMm0yIDBoMW0zIDBoMU00IDMxLjVoMW01IDBoMW01IDBoM20xIDBoM20xIDBoMW0zIDBoMW0yIDBoMU00IDMyLjVoN20xIDBoMm0xIDBoMW0xIDBoM20xIDBoNG0yIDBoMW0xIDBoMW0xIDBoMSIvPjwvc3ZnPgo=	Guarucoop / Aeroporto - Guarulhos	Raspberry-pi-03	online	00:01:00	23:59:00	100	2	\N	2025-12-15 01:45:33.954+00	2025-12-13 02:53:18.849788+00	2025-12-15 01:45:33.954833+00	1.00	30	1200	0.6500	\N	\N	50.00	f	\N	\N	\N	10.00	Guarulhos
5e941750-fd5c-4d0e-8fa7-30c1db563809	750284	PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNyAzNyIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMCAwaDM3djM3SDB6Ii8+PHBhdGggc3Ryb2tlPSIjMDAwMDAwIiBkPSJNNCA0LjVoN20yIDBoMW0xIDBoMm0xIDBoMW0yIDBoM20yIDBoN000IDUuNWgxbTUgMGgxbTIgMGgxbTIgMGgxbTMgMGgzbTEgMGgxbTEgMGgxbTUgMGgxTTQgNi41aDFtMSAwaDNtMSAwaDFtMiAwaDFtMSAwaDFtMiAwaDJtMSAwaDFtMSAwaDJtMSAwaDFtMSAwaDNtMSAwaDFNNCA3LjVoMW0xIDBoM20xIDBoMW0yIDBoMW0zIDBoMW00IDBoMW0zIDBoMW0xIDBoM20xIDBoMU00IDguNWgxbTEgMGgzbTEgMGgxbTIgMGgxbTEgMGgybTUgMGgxbTEgMGgxbTEgMGgxbTEgMGgzbTEgMGgxTTQgOS41aDFtNSAwaDFtMSAwaDRtMyAwaDFtMyAwaDJtMSAwaDFtNSAwaDFNNCAxMC41aDdtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDdNMTQgMTEuNWgybTEgMGgxbTEgMGg0TTQgMTIuNWgxbTIgMGgxbTEgMGgybTEgMGgxbTEgMGgzbTEgMGgxbTEgMGgxbTMgMGgybTEgMGgxTTUgMTMuNWgybTIgMGgxbTUgMGgzbTEgMGgxbTEgMGgxbTMgMGgybTIgMGgxbTIgMGgxTTYgMTQuNWg1bTEgMGgxbTEgMGgxbTIgMGgybTEgMGg1bTEgMGgxbTEgMGg0TTYgMTUuNWgxbTIgMGgxbTEgMGgxbTIgMGgxbTIgMGgxbTIgMGgxbTEgMGg0bTEgMGg1TTQgMTYuNWgxbTIgMGgxbTIgMGgybTIgMGgxbTMgMGgxbTEgMGgybTMgMGgybTIgMGgxbTEgMGgyTTQgMTcuNWgybTEgMGgxbTEgMGgxbTMgMGgxbTIgMGg0bTMgMGgxbTEgMGgxbTQgMGgxTTYgMTguNWgxbTIgMGgzbTMgMGgxbTEgMGgybTEgMGgzbTIgMGgxbTIgMGgxbTEgMGgzTTQgMTkuNWg1bTQgMGgxbTIgMGgxbTMgMGgybTEgMGgxbTIgMGgybTEgMGgxbTEgMGgxTTcgMjAuNWg0bTIgMGgxbTIgMGgybTEgMGgxbTEgMGgxbTEgMGgxbTEgMGgxbTMgMGgxbTEgMGgxTTExIDIxLjVoMW0yIDBoMW0yIDBoMm0xIDBoMm0yIDBoMW0xIDBoMm00IDBoMU00IDIyLjVoMW0xIDBoMW0xIDBoMW0xIDBoMW0yIDBoNG0xIDBoM20xIDBoMW0zIDBoMm0xIDBoMW0xIDBoMk03IDIzLjVoM20xIDBoMW0xIDBoMW0yIDBoMW0xIDBoMW0xIDBoNG0zIDBoMW0zIDBoMk00IDI0LjVoMW0yIDBoMW0yIDBoMW0yIDBoMW01IDBoMW00IDBoNW0xIDBoMU0xMiAyNS41aDVtMSAwaDJtNCAwaDFtMyAwaDFtMSAwaDNNNCAyNi41aDdtNSAwaDFtNCAwaDFtMiAwaDFtMSAwaDFtMSAwaDFtMiAwaDFNNCAyNy41aDFtNSAwaDFtMSAwaDNtMyAwaDJtMyAwaDJtMyAwaDFtMSAwaDNNNCAyOC41aDFtMSAwaDNtMSAwaDFtMiAwaDNtNSAwaDFtMiAwaDVtMiAwaDFNNCAyOS41aDFtMSAwaDNtMSAwaDFtMSAwaDNtNCAwaDNtMiAwaDFtMSAwaDVtMSAwaDFNNCAzMC41aDFtMSAwaDNtMSAwaDFtNCAwaDRtMiAwaDFtMiAwaDJtMiAwaDFtMyAwaDFNNCAzMS41aDFtNSAwaDFtMiAwaDFtMSAwaDRtMSAwaDNtMSAwaDFtMyAwaDFtMiAwaDFNNCAzMi41aDdtMSAwaDFtMSAwaDFtNCAwaDFtMSAwaDRtMiAwaDFtMSAwaDFtMSAwaDEiLz48L3N2Zz4K	Rua General Glic??rio, 737 - Santo Andr??	Raspberry-pi-02	online	00:01:00	23:59:00	100	2	\N	2025-12-15 01:45:14.709+00	2025-12-13 02:52:00.847352+00	2025-12-15 01:45:14.710421+00	1.00	30	1200	0.6500	\N	\N	50.00	f	\N	\N	\N	10.00	Santo Andr??
2c8e0dee-3df8-488d-9d13-e9c6ba91c9f2	305718	PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNyAzNyIgc2hhcGUtcmVuZGVyaW5nPSJjcmlzcEVkZ2VzIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNMCAwaDM3djM3SDB6Ii8+PHBhdGggc3Ryb2tlPSIjMDAwMDAwIiBkPSJNNCA0LjVoN20yIDBoM20zIDBoNm0xIDBoN000IDUuNWgxbTUgMGgxbTMgMGgybTggMGgxbTEgMGgxbTUgMGgxTTQgNi41aDFtMSAwaDNtMSAwaDFtMSAwaDJtMSAwaDJtMSAwaDFtMSAwaDFtMiAwaDJtMSAwaDFtMSAwaDNtMSAwaDFNNCA3LjVoMW0xIDBoM20xIDBoMW0xIDBoNW00IDBoMW0xIDBoMW0yIDBoMW0xIDBoM20xIDBoMU00IDguNWgxbTEgMGgzbTEgMGgxbTEgMGgxbTIgMGg1bTIgMGgybTIgMGgxbTEgMGgzbTEgMGgxTTQgOS41aDFtNSAwaDFtMSAwaDFtMiAwaDVtMiAwaDFtMyAwaDFtNSAwaDFNNCAxMC41aDdtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDFtMSAwaDdNMTIgMTEuNWg2bTEgMGgxTTQgMTIuNWgxbTEgMGg1bTMgMGgybTIgMGgybTEgMGgxbTIgMGgxbTEgMGg1TTQgMTMuNWgxbTEgMGg0bTQgMGgxbTEgMGgxbTIgMGgxbTIgMGgybTEgMGg0bTMgMGgxTTQgMTQuNWgybTIgMGgxbTEgMGgxbTkgMGgzbTIgMGgybTEgMGgxTTQgMTUuNWg0bTMgMGgybTEgMGgxbTEgMGgxbTEgMGgxbTYgMGgxbTEgMGgxbTMgMGgxTTcgMTYuNWgxbTIgMGgxbTIgMGgzbTMgMGgzbTIgMGgxbTQgMGgyTTEyIDE3LjVoMm0xIDBoMW0xIDBoMm0yIDBoM20xIDBoNG0xIDBoMW0xIDBoMU00IDE4LjVoNW0xIDBoMW0yIDBoM20xIDBoMm0xIDBoMW0xIDBoMW0zIDBoM20xIDBoMU02IDE5LjVoMm0zIDBoMW0xIDBoMW0xIDBoM20xIDBoMW0yIDBoMW0zIDBoMW0xIDBoMW0yIDBoMU00IDIwLjVoMW0xIDBoMm0yIDBoNm0yIDBoNG0yIDBoMW01IDBoMU00IDIxLjVoM20xIDBoMm0zIDBoMW0xIDBoMW01IDBoM20yIDBoNW0xIDBoMU00IDIyLjVoMW0xIDBoMm0yIDBoNm0zIDBoMm0xIDBoMW0xIDBoMm0xIDBoMW0xIDBoMk00IDIzLjVoMW0yIDBoM201IDBoMW0yIDBoMm0zIDBoMW0yIDBoMW0xIDBoMW0yIDBoMU00IDI0LjVoMW0yIDBoNG0xIDBoMW0xIDBoMW0xIDBoMW0zIDBoMm0yIDBoNW0xIDBoM00xMiAyNS41aDFtMiAwaDVtMSAwaDRtMyAwaDVNNCAyNi41aDdtMyAwaDFtMiAwaDNtMSAwaDFtMSAwaDJtMSAwaDFtMSAwaDNNNCAyNy41aDFtNSAwaDFtMSAwaDFtMSAwaDFtMSAwaDJtMSAwaDFtMiAwaDFtMSAwaDFtMyAwaDJtMSAwaDJNNCAyOC41aDFtMSAwaDNtMSAwaDFtMSAwaDJtMSAwaDFtMiAwaDRtMiAwaDVtMSAwaDFtMSAwaDFNNCAyOS41aDFtMSAwaDNtMSAwaDFtMSAwaDFtMSAwaDNtMiAwaDFtMiAwaDFtMSAwaDFtNCAwaDJNNCAzMC41aDFtMSAwaDNtMSAwaDFtMSAwaDFtMyAwaDJtMSAwaDJtMyAwaDFtMSAwaDNtMiAwaDFNNCAzMS41aDFtNSAwaDFtNCAwaDRtMSAwaDFtMiAwaDJtMiAwaDFtMSAwaDFtMSAwaDFNNCAzMi41aDdtMSAwaDFtNCAwaDFtMyAwaDJtMiAwaDFtMSAwaDFtMiAwaDEiLz48L3N2Zz4K	R. Pr??ncipe Humberto, 450 - SBC	Raspberry-pi-05	online	00:01:00	23:59:00	100	1	\N	2025-12-15 01:45:44.654+00	2025-12-13 02:56:49.862966+00	2025-12-15 01:45:44.654721+00	1.00	30	1200	0.6500	\N	2025-12-14 21:24:54.368+00	50.00	f	\N	\N	\N	10.00	S??o Bernardo do Campo
\.


--
-- Data for Name: maintenance_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.maintenance_logs (id, machine_id, type, performed_by, description, cost, parts_replaced, next_maintenance_due, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, type, machine_id, message, whatsapp_status, created_at) FROM stdin;
f6f72bdb-7640-4bde-a9b5-a4ff3b5755c4	machine_offline	c5530a32-e9a9-40cc-a227-2f2c1504dc74	???? M??QUINA OFFLINE\n\nM??quina: 483921\nLocal: Av. Portugal 1756 - Santo Andr??\n??ltima conex??o: h?? 4 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-14 21:14:49.185099+00
d5900cf4-f1fc-4944-b6c0-2ca42f0c72bb	machine_offline	2c8e0dee-3df8-488d-9d13-e9c6ba91c9f2	???? M??QUINA OFFLINE\n\nM??quina: 305718\nLocal: R. Pr??ncipe Humberto, 450 - SBC\n??ltima conex??o: h?? 2 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-14 20:41:50.536964+00
d3eeabbb-288e-489e-99a2-4f29faefb889	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: 000001\nLocation: Alpha\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-13 05:15:15.617855+00
e1304ac7-fff0-47f3-997c-39f7a05e8c23	machine_offline	5e941750-fd5c-4d0e-8fa7-30c1db563809	???? MACHINE OFFLINE\n\nMachine: 750284\nLocation: Rua General Glic??rio, 737 - Santo Andr??\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 20:14:47.584327+00
e25981d2-32e5-4e09-b121-10405b838a2d	machine_offline	0601f2c7-9d21-4b20-91cd-d3bc87c40c8e	???? MACHINE OFFLINE\n\nMachine: 842609\nLocation: Av. S??o Lu??s 840 - Guarulhos\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 17:08:44.292474+00
f379a585-54ac-468b-8b02-b7b49a1f08ff	machine_offline	0601f2c7-9d21-4b20-91cd-d3bc87c40c8e	???? MACHINE OFFLINE\n\nMachine: 842609\nLocation: Av. S??o Lu??s 840 - Guarulhos\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 17:04:44.206095+00
6ec139bd-235d-4859-b1cd-90eecc814a01	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: 000001\nLocation: Alpha\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-12 18:59:43.019576+00
6367eb77-5016-4f0f-aa6a-ec53a8cf4948	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 8461 minutes ago\n\nPlease check the machine connection.	failed	2025-12-12 18:37:28.213056+00
ff8a42fc-32bf-42ee-94b0-ecd7b90f4335	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 7245 minutes ago\n\nPlease check the machine connection.	failed	2025-12-11 22:21:23.233335+00
d8195e24-94c3-410c-b519-c836cd428c60	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 19:27:42.676094+00
7bc7afbd-1880-452a-99ab-6ffcd712b483	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 623 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 13:51:37.758611+00
3f75e84a-8e51-4e70-a0f4-c4869a481297	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 6 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 02:42:41.516626+00
c66558aa-e116-461e-8f9c-07f4944ade4b	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 5 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 01:05:44.921509+00
03d210d7-56bf-494b-ad04-57eafa6d309f	machine_offline	c5530a32-e9a9-40cc-a227-2f2c1504dc74	???? M??QUINA OFFLINE\n\nM??quina: 483921\nLocal: Av. Portugal 1756 - Santo Andr??\n??ltima conex??o: h?? 2 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-15 01:16:17.283726+00
8594ebce-0bd9-406f-b2ed-dafff68c071f	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 5 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 01:05:44.918772+00
7569e438-f084-400c-acc9-c528d7ade289	machine_offline	c5530a32-e9a9-40cc-a227-2f2c1504dc74	???? M??QUINA OFFLINE\n\nM??quina: 483921\nLocal: Av. Portugal 1756 - Santo Andr??\n??ltima conex??o: h?? 2 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-14 21:37:57.734572+00
6b1230bd-c704-44a9-9ed7-6783e29cf5df	machine_offline	5e941750-fd5c-4d0e-8fa7-30c1db563809	???? M??QUINA OFFLINE\n\nM??quina: 750284\nLocal: Rua General Glic??rio, 737 - Santo Andr??\n??ltima conex??o: h?? 4 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-14 21:14:49.406089+00
b324d091-0273-4448-aa7c-31cece086358	machine_offline	1a4493bf-293b-49dc-9dc8-f84808034e4b	???? MACHINE OFFLINE\n\nMachine: 196537\nLocation: Guarucoop / Aeroporto - Guarulhos\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 07:10:48.401072+00
f677d48a-aca9-4750-867f-b27dde56ed75	machine_offline	1a4493bf-293b-49dc-9dc8-f84808034e4b	???? MACHINE OFFLINE\n\nMachine: 196537\nLocation: Guarucoop / Aeroporto - Guarulhos\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 07:07:48.36673+00
46ad99cf-06fe-4ec6-a08d-00908beaa835	machine_offline	1a4493bf-293b-49dc-9dc8-f84808034e4b	???? MACHINE OFFLINE\n\nMachine: 196537\nLocation: Guarucoop / Aeroporto - Guarulhos\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 07:04:48.340396+00
252e67f7-0d75-4d01-8049-3e8943107a57	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: 000001\nLocation: Alpha\nLast seen: 520 minutes ago\n\nPlease check the machine connection.	failed	2025-12-13 15:52:13.139169+00
8704c61d-5c42-4567-aad7-f070c5c92d37	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC-03\nLocation: Estacionamento\nLast seen: 6 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 01:01:44.910787+00
82aa28a0-32d6-4a94-afdf-980703ed1455	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC-03\nLocation: Estacionamento\nLast seen: 6 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 01:01:44.902752+00
a27e2e72-d791-4099-bc7b-687f20245085	machine_offline	2c8e0dee-3df8-488d-9d13-e9c6ba91c9f2	???? M??QUINA OFFLINE\n\nM??quina: 305718\nLocal: R. Pr??ncipe Humberto, 450 - SBC\n??ltima conex??o: h?? 2 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-14 21:28:27.363755+00
bdf70996-ad22-4f36-a85c-1fa43fd59e7b	machine_offline	1a4493bf-293b-49dc-9dc8-f84808034e4b	???? M??QUINA OFFLINE\n\nM??quina: 196537\nLocal: Guarucoop / Aeroporto - Guarulhos\n??ltima conex??o: h?? 2 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-14 21:28:26.239757+00
681f6a91-7e7a-4779-a678-1a0be26214c7	machine_offline	0601f2c7-9d21-4b20-91cd-d3bc87c40c8e	???? M??QUINA OFFLINE\n\nM??quina: 842609\nLocal: Av. S??o Lu??s 840 - Guarulhos\n??ltima conex??o: h?? 4 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-14 21:14:48.939792+00
0ed8cc04-e375-4c69-88fd-d123f2d361e3	machine_offline	5e941750-fd5c-4d0e-8fa7-30c1db563809	???? MACHINE OFFLINE\n\nMachine: 750284\nLocation: Rua General Glic??rio, 737 - Santo Andr??\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 20:17:47.218542+00
353dc68e-a458-42ed-a9f6-5afa14ccd855	machine_offline	0601f2c7-9d21-4b20-91cd-d3bc87c40c8e	???? MACHINE OFFLINE\n\nMachine: 842609\nLocation: Av. S??o Lu??s 840 - Guarulhos\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 17:11:13.973667+00
a7dc1fe4-b6c9-4bc6-acdb-afac927a3b97	machine_offline	c5530a32-e9a9-40cc-a227-2f2c1504dc74	???? MACHINE OFFLINE\n\nMachine: 483921\nLocation: Av. Portugal 1756 - Santo Andr??\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 07:39:48.855325+00
8a2ce24e-b797-4d93-b79a-7848c88910aa	machine_offline	c5530a32-e9a9-40cc-a227-2f2c1504dc74	???? MACHINE OFFLINE\n\nMachine: 483921\nLocation: Av. Portugal 1756 - Santo Andr??\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-14 07:35:48.781845+00
36c55a2a-7497-4305-bb35-f7154e777591	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: 000001\nLocation: Alpha\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-12 20:12:35.034962+00
32e3c2bd-c13d-437f-8de8-1bd1fec081cb	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: 000001\nLocation: Alpha\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-12 19:47:56.984603+00
3bd07484-c241-4b83-8157-f7fb3f5e4190	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 03:26:04.469553+00
955f3560-814d-4b7a-9f28-c070a042245b	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 03:21:34.409361+00
214d767e-7ad7-4bd5-b588-df8eb5da2dc1	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 03:14:04.296527+00
b6c0f5d6-5f2a-4006-8616-fc7ba123bec5	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 2 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 03:08:34.130409+00
55f9a2c4-22ed-47f7-ba8c-968563792f01	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 7 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 02:57:21.111408+00
4a33a8f8-0cfb-4bde-a8f0-ec8f37f2a3ac	machine_offline	\N	???? MACHINE OFFLINE\n\nMachine: UPC001\nLocation: Alpha\nLast seen: 6 minutes ago\n\nPlease check the machine connection.	failed	2025-12-05 02:42:41.51678+00
896c8e29-72d5-4248-8666-aef1698c18b1	machine_offline	2c8e0dee-3df8-488d-9d13-e9c6ba91c9f2	???? M??QUINA OFFLINE\n\nM??quina: 305718\nLocal: R. Pr??ncipe Humberto, 450 - SBC\n??ltima conex??o: h?? 2 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-15 01:05:18.002228+00
856d03ec-6d22-4a9a-bc5b-03044dd5a545	machine_offline	c5530a32-e9a9-40cc-a227-2f2c1504dc74	???? M??QUINA OFFLINE\n\nM??quina: 483921\nLocal: Av. Portugal 1756 - Santo Andr??\n??ltima conex??o: h?? 2 minutos\n\nPor favor, verifique a conex??o da m??quina.	failed	2025-12-15 01:05:17.747341+00
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, user_id, type, amount, payment_method, payment_id, status, created_at) FROM stdin;
d954ba04-f6c9-4fc4-914c-4c2a42cda505	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	44.00	pix	\N	completed	2025-11-06 18:18:00+00
6ee1b693-2b1b-4936-bd2d-08a6ee3ac1e6	59584e99-2a96-4048-8410-3dd7b2a138ea	usage_payment	20.00	pix	\N	completed	2025-11-27 10:16:00+00
5fd3718f-b0e7-428e-a0c9-ec63bdecf3bb	4debd1a4-fa95-4afc-aa31-282db0071651	usage_payment	46.00	pix	\N	completed	2025-11-03 12:28:00+00
6ba738d3-0bce-4a0d-a77d-021694dfbd15	b2fea938-22a8-4884-84ec-e7a3a14cf7a2	usage_payment	42.00	pix	\N	completed	2025-11-09 11:33:00+00
33c00bb8-2933-46b3-8e03-c04e620331c9	b2fea938-22a8-4884-84ec-e7a3a14cf7a2	usage_payment	34.00	pix	\N	completed	2025-11-05 11:28:00+00
079130f0-f33f-4da9-9e52-acbc9a8d9f2d	0b62760b-e170-42d3-bc31-f318d0dc7a64	usage_payment	40.00	pix	\N	completed	2025-11-06 11:14:00+00
5b915d84-0229-4595-bec2-ea83bb1118fc	4debd1a4-fa95-4afc-aa31-282db0071651	usage_payment	38.00	pix	\N	completed	2025-11-24 20:06:00+00
65522a59-6ea0-456d-8e41-c7e5a9b7c04b	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	14.00	pix	\N	completed	2025-11-22 10:40:00+00
6565b723-0112-4740-ae36-38047780b5c4	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	52.00	pix	\N	completed	2025-11-16 10:25:00+00
fbc80dbb-5b34-4142-809f-fa81db648f58	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	56.00	pix	\N	completed	2025-11-24 09:13:00+00
6f8bbc77-0c2f-444a-885f-96d326dbb512	0b62760b-e170-42d3-bc31-f318d0dc7a64	usage_payment	24.00	pix	\N	completed	2025-11-20 15:32:00+00
ceb164c9-225b-413a-97ef-7329c155ec1b	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	36.00	pix	\N	completed	2025-11-10 11:22:00+00
abcb255a-f8fc-41a9-9950-147af007fb79	4debd1a4-fa95-4afc-aa31-282db0071651	usage_payment	60.00	pix	\N	completed	2025-10-31 15:19:00+00
9b14c008-62b7-418b-9539-07c44e7271c5	a4994cb2-8678-455c-883d-cab6527883c7	usage_payment	42.00	pix	\N	completed	2025-11-12 11:28:00+00
284fab27-92e0-42b8-8218-c9910d49109c	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	10.00	pix	\N	completed	2025-11-03 18:53:00+00
78e60b17-dc70-4432-a89f-994380efddc1	0b62760b-e170-42d3-bc31-f318d0dc7a64	usage_payment	50.00	pix	\N	completed	2025-11-19 17:36:00+00
30d1a881-a150-4cce-914f-be44de9d3677	4debd1a4-fa95-4afc-aa31-282db0071651	usage_payment	14.00	pix	\N	completed	2025-11-07 13:32:00+00
228933f2-cf0c-4ed1-81b0-684fed6352e0	a4994cb2-8678-455c-883d-cab6527883c7	usage_payment	26.00	pix	\N	completed	2025-11-09 16:16:00+00
1b8dc787-2ab0-48b7-961e-22ef00839192	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	38.00	pix	\N	completed	2025-11-16 00:47:00+00
4b310ec2-6151-45c2-96a8-63361006cd4d	59584e99-2a96-4048-8410-3dd7b2a138ea	usage_payment	26.00	pix	\N	completed	2025-11-15 10:59:00+00
01a2832f-3415-4e2d-88e9-2effdf529ade	a4994cb2-8678-455c-883d-cab6527883c7	usage_payment	44.00	pix	\N	completed	2025-11-13 15:54:00+00
519989fd-e7ae-4aed-b4a1-b382b75e2607	0b62760b-e170-42d3-bc31-f318d0dc7a64	usage_payment	46.00	pix	\N	completed	2025-11-26 23:20:00+00
da1fc53e-f5e6-44a8-83b9-cd90c3ee59a2	0b62760b-e170-42d3-bc31-f318d0dc7a64	usage_payment	42.00	pix	\N	completed	2025-11-20 22:13:00+00
753da3aa-ab16-4f9c-9378-861cbe6a0a23	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	26.00	pix	\N	completed	2025-10-29 13:22:00+00
0ef76bf8-1ab9-4a79-8087-7af6f485f39f	b2fea938-22a8-4884-84ec-e7a3a14cf7a2	usage_payment	52.00	pix	\N	completed	2025-11-15 17:29:00+00
a4012390-2335-4d10-9754-920e1790aa13	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	56.00	pix	\N	completed	2025-11-03 23:03:00+00
46ed2eee-681e-45ce-9a3c-83d985cc81c2	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	10.00	pix	\N	completed	2025-11-19 23:06:00+00
ca2da9d8-c97f-498b-96ae-4121a4050113	4debd1a4-fa95-4afc-aa31-282db0071651	usage_payment	32.00	pix	\N	completed	2025-11-27 10:09:00+00
27638e8d-d1a9-4c34-9502-799754f75daf	59584e99-2a96-4048-8410-3dd7b2a138ea	usage_payment	60.00	pix	\N	completed	2025-10-31 17:47:00+00
cdbfb926-8122-4e3b-88c4-ad7ea086fee7	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	48.00	pix	\N	completed	2025-11-03 22:25:00+00
8d7d6eeb-3368-4bab-b0fd-6064a2812edc	4debd1a4-fa95-4afc-aa31-282db0071651	usage_payment	34.00	pix	\N	completed	2025-11-05 17:15:00+00
a992389d-76ce-444d-b901-8a0aa6751f69	0b62760b-e170-42d3-bc31-f318d0dc7a64	usage_payment	52.00	pix	\N	completed	2025-10-30 12:32:00+00
95633892-44b7-4807-b214-aea2e55bcfa4	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	38.00	pix	\N	completed	2025-11-17 12:37:00+00
20336869-20b5-4e86-8f44-50e7fa75ab89	a4994cb2-8678-455c-883d-cab6527883c7	usage_payment	14.00	pix	\N	completed	2025-11-05 22:31:00+00
0a667710-682b-4c17-b9fb-5099be1bb53d	b2fea938-22a8-4884-84ec-e7a3a14cf7a2	usage_payment	14.00	pix	\N	completed	2025-11-06 21:44:00+00
fb45f2ad-97ca-4285-958f-440f9850ff7b	59584e99-2a96-4048-8410-3dd7b2a138ea	usage_payment	52.00	pix	\N	completed	2025-11-07 21:09:00+00
455809a0-d9ac-49a9-8575-efa449790c5e	b2fea938-22a8-4884-84ec-e7a3a14cf7a2	usage_payment	24.00	pix	\N	completed	2025-11-10 11:47:00+00
e0bcded9-c343-4222-9688-65fa43d4e002	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	34.00	pix	\N	completed	2025-11-22 15:28:00+00
b9e52178-8368-4715-9c7a-1e1a648f19f1	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	22.00	pix	\N	completed	2025-11-20 00:13:00+00
fea49eb1-402a-4403-b39f-a7bad901ffb1	4debd1a4-fa95-4afc-aa31-282db0071651	usage_payment	36.00	pix	\N	completed	2025-10-30 12:13:00+00
c2b22b76-dedf-4de1-bac8-53b23eb7fbdb	59584e99-2a96-4048-8410-3dd7b2a138ea	usage_payment	60.00	pix	\N	completed	2025-11-06 13:34:00+00
288d2512-fce6-498e-bc5b-4c7f73c08d6d	a4994cb2-8678-455c-883d-cab6527883c7	usage_payment	50.00	pix	\N	completed	2025-11-25 11:25:00+00
815082a2-cf8b-4c19-b6d2-23f3f7b3f03c	b2fea938-22a8-4884-84ec-e7a3a14cf7a2	usage_payment	58.00	pix	\N	completed	2025-11-11 15:11:00+00
5e51fd0b-4963-4a5d-8d5f-a952dbf4f7c8	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	32.00	pix	\N	completed	2025-11-22 00:16:00+00
298cec2a-50e3-498a-a36c-945ca06164ea	4debd1a4-fa95-4afc-aa31-282db0071651	usage_payment	42.00	pix	\N	completed	2025-11-07 20:29:00+00
f51594b6-f2c5-4827-8210-85a5bd4dfd65	4debd1a4-fa95-4afc-aa31-282db0071651	usage_payment	28.00	pix	\N	completed	2025-11-27 19:54:00+00
5a3c6668-1bba-4ccf-8a2d-8dff6474e9b9	0b62760b-e170-42d3-bc31-f318d0dc7a64	usage_payment	38.00	pix	\N	completed	2025-11-19 21:32:00+00
7569e9b2-b6f9-478c-977e-3c50f8832f69	59584e99-2a96-4048-8410-3dd7b2a138ea	usage_payment	46.00	pix	\N	completed	2025-11-01 20:12:00+00
b1d5fdae-3ea8-4251-881c-8e9fd1b37b23	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	48.00	pix	\N	completed	2025-11-06 00:34:00+00
353cd5ee-cd31-4bef-b663-5d6f3ffe6fc9	c4ac68a9-5f0b-47bb-b773-13295ef32726	usage_payment	48.00	pix	\N	completed	2025-11-11 21:15:00+00
74bf9f7c-4d4d-4218-b2bd-0157f6f2a809	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	33.00	admin_credit	\N	completed	2025-11-28 17:55:54.304416+00
aa35fd3c-8fe9-44fc-a7b9-b0b4473dbd64	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	5.00	admin_credit	\N	pending	2025-12-01 03:47:37.134323+00
98163f15-5056-4116-a978-4478298e40ec	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	2.00	admin_credit	\N	pending	2025-12-01 03:57:42.792031+00
7039c56e-bdbe-4d6a-9fb6-538d4d61b6c5	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-01 04:20:22.927388+00
47812354-e35a-4e91-ac23-997637f9e82c	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-01 04:23:50.480241+00
86448c4a-8c75-447b-8c5f-b1ff817a8158	fb24e954-acc5-4b7e-a5e1-7dca8aa04aa3	credit_added	10.00	admin_credit	\N	completed	2025-12-04 03:20:40.328273+00
8fad8445-ad24-4b0b-af94-761ee6a000ef	fb24e954-acc5-4b7e-a5e1-7dca8aa04aa3	credit_added	20.00	admin_credit	\N	completed	2025-12-04 04:38:42.017546+00
fdb846ee-4c44-46c0-ae4c-a7091d5e130f	fb24e954-acc5-4b7e-a5e1-7dca8aa04aa3	credit_added	100.00	admin_credit	\N	completed	2025-12-04 04:38:50.581076+00
f0378e71-b97a-4d93-9262-e57ecbd48370	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 00:30:41.301846+00
684705c3-7a5a-47bb-ad95-40fa74fbca6e	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 01:08:52.706326+00
20971fb7-4e9d-462f-9de7-9d968a7359da	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 01:10:14.83396+00
49eff9d7-3ae8-48e0-b051-75cd6ea01671	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 01:13:27.552178+00
347ed3c9-20a7-4b81-b95d-13e80788876c	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	2.00	admin_credit	\N	pending	2025-12-05 01:16:24.25185+00
05786b6b-dca0-40bf-83d2-c51d3c3effe6	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 01:31:07.208225+00
b486e3e1-097c-4232-8563-052aecd603be	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 01:33:49.488376+00
6beae58e-02e9-4de9-b21d-d23aea3925e3	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 02:50:29.067568+00
3f1f4c6a-d5c6-4d96-ad80-25d6edcaec51	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 03:03:35.30653+00
f260fea3-3fdb-47e4-8497-dccccfec3076	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 03:03:54.344071+00
cb1448cc-821d-4495-8f73-e2d129822eb5	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 03:22:59.681283+00
ed957462-ad3f-47cc-a275-28b23a0e2aa5	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 03:28:45.562541+00
90ac4854-6b67-4c35-a235-058cc3b6ccef	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 13:54:49.322631+00
b5153309-97fd-433d-b706-49e18fb92c5c	ac2aded4-323b-492d-8476-078a5e5b5394	credit_added	100.00	admin_credit	\N	completed	2025-12-05 14:00:15.81383+00
2e30ac37-fcaa-4180-b384-5b0869b401aa	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	5.00	admin_credit	\N	pending	2025-12-05 14:00:31.817111+00
16575073-5891-4fa5-987d-2ff97b73b32b	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	2.00	admin_credit	\N	pending	2025-12-05 14:17:08.812966+00
2c675d2f-542c-48bd-bcaf-1e6af770cab2	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	1.00	admin_credit	\N	pending	2025-12-05 14:33:47.43214+00
acea53da-a68c-469e-857e-30a8656f72a8	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	50.00	admin_credit	\N	completed	2025-12-06 21:32:57.98889+00
cd337902-bce8-4ff9-9e87-c1ed431788c7	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-06 21:34:38.475485+00
7d91fd84-0b18-4513-a21d-7b7333769870	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	5.00	admin_credit	\N	pending	2025-12-12 18:38:17.802161+00
78a48655-b4a2-4fa0-a5e1-f98dbee18c70	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	5.00	admin_credit	\N	pending	2025-12-12 18:55:56.765308+00
9a08b0de-9ed3-429f-86d0-42e866e544be	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	30.00	admin_credit	\N	pending	2025-12-12 19:19:59.199214+00
97aa6e8b-559a-4b98-a3cf-2b466462b9ab	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	17.00	admin_credit	\N	pending	2025-12-12 19:20:36.833554+00
112bd0bc-96b3-42ab-9033-9f615f239d40	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	9999.00	admin_credit	\N	completed	2025-12-12 19:22:19.336635+00
e66a9e2f-1a6c-45d4-8e1b-84731b09b055	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	5.00	admin_credit	\N	pending	2025-12-13 04:08:50.29293+00
4a62588b-e635-4e5d-8641-7456d7945b2e	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	5.00	admin_credit	\N	pending	2025-12-13 04:55:57.11217+00
e57ca40a-7977-4b54-84c0-6c980af18f97	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	137696068462	pending	2025-12-13 05:15:39.593073+00
95c7b93c-a1ed-4474-a405-3f8aeb92e704	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	137696068538	pending	2025-12-13 05:18:26.808346+00
93127cd1-939f-4f07-8921-eb343519a316	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	137694729522	pending	2025-12-13 05:20:59.371128+00
95a9765a-5b63-458d-ba84-4673a7067ff2	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	137060923805	pending	2025-12-13 05:22:25.150526+00
f4d2505a-8cd4-4922-a7ba-f8c2909e1538	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-13 05:28:14.422151+00
a3cec6eb-772d-41e0-a905-8889a68ad32b	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	137696202672	pending	2025-12-13 05:28:30.09246+00
235a3bb3-834a-4803-a44a-686f0702c3bc	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	137695257556	pending	2025-12-13 05:40:58.693219+00
0aa45ae0-2ec9-403d-9879-33ca89bdb782	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	137697298372	pending	2025-12-13 05:47:00.160637+00
c9517954-d513-47ca-9d6e-10f9558d1647	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	137696295176	pending	2025-12-13 05:52:04.955065+00
ce965b5d-fc47-4c39-a036-aacfb7eefa5d	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	137697822218	pending	2025-12-13 05:56:40.894367+00
b1c80260-e0eb-406a-bbfc-c0ec56675071	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	subscription_payment	59.90	pix	137065034265	pending	2025-12-13 06:24:42.85003+00
f67d85f1-c846-4abe-b679-9bcb8834243d	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	1325653532	pending	2025-12-13 22:16:01.688084+00
edfd4545-cab7-4440-95d9-44b5e8b51e7e	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	1.00	pix	1343160357	pending	2025-12-14 05:54:31.338294+00
32516ad6-e695-4e00-8ffa-45e5ae01300b	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-14 07:03:04.892048+00
14d43205-ccf4-4971-908f-803e912cc159	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-14 07:09:12.391678+00
fabc7ebc-9884-4fd2-a2e8-c9af24dab084	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-14 07:33:50.111388+00
48f13861-fa02-4c8b-99c7-727d430579eb	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-14 07:38:10.730424+00
b269ad71-701a-4ac9-a4a0-9aa03868bfc2	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-14 17:02:59.772751+00
4d173f57-ba45-4727-9668-f4cc55adc9f0	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	1.00	admin_credit	\N	pending	2025-12-14 17:09:23.698799+00
de30518b-c971-4257-8cdf-7679f37120c9	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	2.00	admin_credit	\N	pending	2025-12-14 20:12:49.666599+00
a6f4e299-8a12-4495-9fd6-bf5a52f3bbf4	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	5.00	admin_credit	\N	pending	2025-12-14 20:16:01.809329+00
a90e6ac6-ad81-486d-a3ee-2ba148d9b312	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	20.00	admin_credit	\N	pending	2025-12-14 20:40:07.209069+00
7cc7427e-2e83-4931-a144-85c4cc7c3859	ac2aded4-323b-492d-8476-078a5e5b5394	usage_payment	2.00	admin_credit	\N	pending	2025-12-14 21:08:23.500744+00
b4766c61-afe2-4f7b-b2ff-ecdba9f92ad6	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	usage_payment	5.00	admin_credit	\N	pending	2025-12-14 21:25:11.246658+00
d7a96417-b898-41ff-b97d-66f1994623ed	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	0.01	pix	1325657198	pending	2025-12-14 21:32:27.7982+00
88ca5c7e-f257-42e5-acbd-486e0a8e5f83	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	0.01	pix	1325658050	pending	2025-12-15 00:49:58.102962+00
5f6dcadc-874f-4b74-9b09-6979ff6daec8	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	credit_added	0.01	pix	137280517797	pending	2025-12-15 01:00:02.386199+00
\.


--
-- Data for Name: usage_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usage_sessions (id, user_id, machine_id, duration, cost, payment_method, payment_id, status, start_time, end_time, created_at) FROM stdin;
c031019a-0077-4cfa-b005-b1d294e955a1	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	c5530a32-e9a9-40cc-a227-2f2c1504dc74	1	1.00	balance	\N	completed	2025-12-14 07:33:50.121+00	2025-12-14 07:33:53.998+00	2025-12-14 07:33:50.104197+00
4be522d0-c745-4c0b-82d6-ef427f0a6608	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	0601f2c7-9d21-4b20-91cd-d3bc87c40c8e	1	1.00	balance	\N	completed	2025-12-14 17:02:59.793+00	2025-12-14 17:03:04.383+00	2025-12-14 17:02:59.75901+00
bf1798df-885c-4ece-9d04-7b9bf631ea2c	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	0601f2c7-9d21-4b20-91cd-d3bc87c40c8e	1	1.00	balance	\N	completed	2025-12-14 17:09:23.72+00	2025-12-14 17:09:26.977+00	2025-12-14 17:09:23.697227+00
9625b6a2-fa65-4e8d-80ea-53d1d8f3a799	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	5e941750-fd5c-4d0e-8fa7-30c1db563809	5	5.00	balance	\N	completed	2025-12-14 20:16:01.823+00	2025-12-14 20:16:05.644+00	2025-12-14 20:16:01.806772+00
490fcc9c-c53d-4ec4-94d2-201700a63a37	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	2c8e0dee-3df8-488d-9d13-e9c6ba91c9f2	20	20.00	balance	\N	completed	2025-12-14 20:40:07.224+00	2025-12-14 20:40:09.591+00	2025-12-14 20:40:07.202937+00
27dab64f-4567-4b85-ba9b-76f3fc5dc3f1	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	1a4493bf-293b-49dc-9dc8-f84808034e4b	1	1.00	balance	\N	completed	2025-12-14 07:03:04.907+00	2025-12-14 07:03:16.496+00	2025-12-14 07:03:04.885365+00
525dfdc7-2598-4615-ac1a-967b404a8f41	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	2c8e0dee-3df8-488d-9d13-e9c6ba91c9f2	5	5.00	balance	\N	completed	2025-12-14 21:25:11.261+00	2025-12-14 21:25:12.799+00	2025-12-14 21:25:11.240844+00
f082535f-fda1-408a-8aca-f9b1493fb970	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	c5530a32-e9a9-40cc-a227-2f2c1504dc74	1	1.00	balance	\N	completed	2025-12-14 07:38:10.74+00	2025-12-14 07:38:15.581+00	2025-12-14 07:38:10.724153+00
7ff15f6a-e97b-43b3-8f09-350db8debe05	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	5e941750-fd5c-4d0e-8fa7-30c1db563809	2	2.00	balance	\N	completed	2025-12-14 20:12:49.678+00	2025-12-14 20:12:54.747+00	2025-12-14 20:12:49.660682+00
14826a04-a78a-4fe0-976c-d9b339939e41	ac2aded4-323b-492d-8476-078a5e5b5394	2c8e0dee-3df8-488d-9d13-e9c6ba91c9f2	2	2.00	balance	\N	completed	2025-12-14 21:08:23.528+00	2025-12-14 21:08:37.321+00	2025-12-14 21:08:23.494676+00
b41a8856-eb12-4a2c-8032-aae2fbc07861	8a09acb8-defc-4cd1-8752-4cd6f7073a4b	1a4493bf-293b-49dc-9dc8-f84808034e4b	1	1.00	balance	\N	completed	2025-12-14 07:09:12.402+00	2025-12-14 07:09:15.587+00	2025-12-14 07:09:12.385772+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, name, google_id, password_hash, account_balance, subscription_status, subscription_expiry, last_daily_use, created_at, updated_at, role) FROM stdin;
0b62760b-e170-42d3-bc31-f318d0dc7a64	test@example.com	Test User	\N	$2a$10$5vS3nW8L1o8gYKzYP0S5uuWJyZeNAnjht4mv.KM1ByQidiC7iOhuS	0.00	none	\N	\N	2025-11-24 21:04:32.446102+00	2025-11-24 21:04:32.446102+00	customer
c4ac68a9-5f0b-47bb-b773-13295ef32726	newuser@example.com	New User	\N	$2a$12$2beiJxpcDYL8do4vM.UoKOagiGm89N9oMwykho0Gb2cZdFWYLYOIm	0.00	none	\N	\N	2025-11-27 15:47:48.222513+00	2025-11-27 15:47:48.222513+00	customer
4debd1a4-fa95-4afc-aa31-282db0071651	demo@example.com	Demo User	\N	$2a$12$XrSvZQmrnVqcfrEEf1Cbp.QRDTCYmXwAavwIKeQwOcIBP4/fd9I46	0.00	none	\N	\N	2025-11-27 15:49:27.784384+00	2025-11-27 15:49:27.784384+00	customer
59584e99-2a96-4048-8410-3dd7b2a138ea	demo@test.com	Demo User	\N	$2a$12$ygGm5Mm8posNr/3EjCChKepzYoiWe04L2HvSCSdE3kmdVZo09RugG	0.00	none	\N	\N	2025-11-27 15:49:58.517219+00	2025-11-27 15:49:58.517219+00	customer
a4994cb2-8678-455c-883d-cab6527883c7	user@test.com	Test User	\N	$2a$12$jwbDqnyGwB48eV5DXnIREOj0H.vzew.LgKpsflv5P.YMKMZybAm3i	0.00	none	\N	\N	2025-11-27 15:51:47.273389+00	2025-11-27 15:51:47.273389+00	customer
b2fea938-22a8-4884-84ec-e7a3a14cf7a2	newuser@test.com	New User	\N	$2a$12$KiATIhKQR3YzmfoJ8j3WxebIPnaDI32B9nsZ6dVHsdjgBdstHKC9m	0.00	none	\N	\N	2025-11-27 16:41:21.183718+00	2025-11-27 16:41:21.183718+00	customer
20132932-2449-41d9-971b-59714452df07	admin@test.com	Admin User	\N	$2a$12$N1MjcEjfKDeXfqC3A/ZB4.0mqSYcKmrvF902OhoaoFAZSmWbRYSMK	0.00	none	\N	\N	2025-11-27 17:31:47.477478+00	2025-11-27 17:40:40.269239+00	admin
8f1cc39b-0cce-473d-883d-104cb4cff1a0	lauracaperuto@gmail.com	Laura Caperuto	115412135562145783009	\N	0.00	none	\N	\N	2025-12-01 01:22:10.183638+00	2025-12-01 01:22:10.183638+00	customer
fb24e954-acc5-4b7e-a5e1-7dca8aa04aa3	juliomechi@gmail.com	Julio	\N	$2a$10$J0mJ9Z7575QO3opyGI1cCu9h4OWgJDth1PHbFd2iNzO.0k3F81qnW	130.00	none	\N	\N	2025-12-02 00:02:01.782064+00	2025-12-04 04:38:50.575028+00	customer
0059bb6a-4cce-47ad-b1ac-b964a6130b17	julio22@gmail.com	Julio	\N	$2a$10$nxT94xo28Ag5uav02Futge96JG6VpVPLJ8m1qF69pmxCadgGvsPmO	0.00	none	\N	\N	2025-12-13 07:11:54.837352+00	2025-12-13 07:11:54.837352+00	customer
ac2aded4-323b-492d-8476-078a5e5b5394	user@demo.com	Test User	\N	$2a$12$2UhFWOuilFuq3skW7dfq5O3rGGEQvYWtcyWAVgtsee0PHT5.oHTFG	87.00	none	\N	\N	2025-11-27 16:51:44.567962+00	2025-12-14 21:08:23.500744+00	customer
8a09acb8-defc-4cd1-8752-4cd6f7073a4b	pedrobpfeitosa@gmail.com	Pedro Benites Pirota Feitosa	\N	$2a$12$XZ1aub1wDhFn1CdpGvuWOe8i7D1MxrpPVWpcN2ZCHPy1280//n13y	9955.00	none	\N	\N	2025-11-28 05:11:49.520706+00	2025-12-14 21:25:11.246658+00	customer
\.


--
-- Name: machines machines_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_code_key UNIQUE (code);


--
-- Name: machines machines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.machines
    ADD CONSTRAINT machines_pkey PRIMARY KEY (id);


--
-- Name: maintenance_logs maintenance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: usage_sessions usage_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_sessions
    ADD CONSTRAINT usage_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_machines_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machines_code ON public.machines USING btree (code);


--
-- Name: idx_machines_controller_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machines_controller_id ON public.machines USING btree (controller_id);


--
-- Name: idx_machines_maintenance_override; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machines_maintenance_override ON public.machines USING btree (maintenance_override) WHERE (maintenance_override = true);


--
-- Name: idx_machines_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_machines_status ON public.machines USING btree (status);


--
-- Name: idx_maintenance_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_logs_created_at ON public.maintenance_logs USING btree (created_at);


--
-- Name: idx_maintenance_logs_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_logs_machine_id ON public.maintenance_logs USING btree (machine_id);


--
-- Name: idx_maintenance_logs_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_maintenance_logs_type ON public.maintenance_logs USING btree (type);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_machine_id ON public.notifications USING btree (machine_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at);


--
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- Name: idx_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_type ON public.transactions USING btree (type);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: idx_usage_sessions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_sessions_created_at ON public.usage_sessions USING btree (created_at);


--
-- Name: idx_usage_sessions_machine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_sessions_machine_id ON public.usage_sessions USING btree (machine_id);


--
-- Name: idx_usage_sessions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_sessions_status ON public.usage_sessions USING btree (status);


--
-- Name: idx_usage_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_usage_sessions_user_id ON public.usage_sessions USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: machines update_machines_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: maintenance_logs maintenance_logs_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: maintenance_logs maintenance_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: usage_sessions usage_sessions_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_sessions
    ADD CONSTRAINT usage_sessions_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.machines(id) ON DELETE CASCADE;


--
-- Name: usage_sessions usage_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_sessions
    ADD CONSTRAINT usage_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict oOswdOcbqHhaFiic120gRGOa3MzQBjwXmJIyP7P4n7oGwEbQpTp3Y49WtUxcMnC

