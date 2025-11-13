--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_settings (
    id integer NOT NULL,
    temperature double precision DEFAULT 0.7 NOT NULL,
    max_output_tokens integer DEFAULT 2048 NOT NULL,
    top_k integer DEFAULT 40 NOT NULL,
    top_p double precision DEFAULT 0.95 NOT NULL,
    enable_tracing boolean DEFAULT false,
    system_prompt text DEFAULT '당신은 전문적인 식물 상담사입니다. 사용자의 질문에 친절하고 정확하게 답변해주세요.'::text NOT NULL,
    plant_recommendation_prompt text DEFAULT '사용자의 환경과 선호도를 고려하여 최적의 식물을 추천해주세요.'::text NOT NULL,
    vendor_communication_prompt text DEFAULT '업체와의 소통에서 전문적이고 친절한 톤을 유지해주세요.'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_settings OWNER TO neondb_owner;

--
-- Name: ai_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ai_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_settings_id_seq OWNER TO neondb_owner;

--
-- Name: ai_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ai_settings_id_seq OWNED BY public.ai_settings.id;


--
-- Name: bids; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bids (
    id integer NOT NULL,
    user_id integer NOT NULL,
    vendor_id integer NOT NULL,
    plant_id integer NOT NULL,
    price numeric(10,2) NOT NULL,
    additional_services text,
    delivery_date timestamp without time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    conversation_id integer,
    selected_product_id integer,
    vendor_message text,
    reference_images json,
    payment_id integer,
    customer_input_address text,
    order_id text
);


ALTER TABLE public.bids OWNER TO neondb_owner;

--
-- Name: bids_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.bids_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bids_id_seq OWNER TO neondb_owner;

--
-- Name: bids_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.bids_id_seq OWNED BY public.bids.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    messages json NOT NULL,
    plant_recommendations json,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_requests text,
    ribbon_request boolean DEFAULT false,
    ribbon_message text,
    delivery_time text
);


ALTER TABLE public.conversations OWNER TO neondb_owner;

--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO neondb_owner;

--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    sender_id integer,
    type text NOT NULL,
    message text NOT NULL,
    conversation_id integer,
    order_id text,
    status text DEFAULT 'unread'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    read_at timestamp without time zone
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer NOT NULL,
    vendor_id integer NOT NULL,
    product_id integer NOT NULL,
    conversation_id integer NOT NULL,
    price numeric(10,2) NOT NULL,
    status text DEFAULT 'created'::text NOT NULL,
    order_id text NOT NULL,
    buyer_info json NOT NULL,
    recipient_info json NOT NULL,
    payment_info json,
    tracking_info json,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


ALTER TABLE public.orders OWNER TO neondb_owner;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO neondb_owner;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    bid_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'ready'::text NOT NULL,
    payment_key text,
    order_id text NOT NULL,
    order_name text NOT NULL,
    method text,
    requested_at timestamp without time zone,
    approved_at timestamp without time zone,
    receipt json,
    customer_name text,
    customer_email text,
    customer_mobile_phone text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    payment_url text,
    fail_reason text,
    cancel_reason text,
    cancelled_at timestamp without time zone,
    merchant_id text,
    tax_invoice_issued boolean DEFAULT false,
    transfer_completed boolean DEFAULT false
);


ALTER TABLE public.payments OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO neondb_owner;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: plants; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.plants (
    id integer NOT NULL,
    name text NOT NULL,
    image_url text,
    scientific_name text,
    description text,
    water_needs text,
    light text,
    humidity text,
    temperature text,
    winter_temperature text,
    color_feature text,
    plant_type text,
    has_thorns boolean,
    leaf_shape1 text,
    leaf_shape2 text,
    leaf_shape3 text,
    leaf_shape4 text,
    experience_level text,
    pet_safety text,
    size text,
    difficulty text,
    price_range text,
    care_instructions text,
    category text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.plants OWNER TO neondb_owner;

--
-- Name: plants_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.plants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plants_id_seq OWNER TO neondb_owner;

--
-- Name: plants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.plants_id_seq OWNED BY public.plants.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.products (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name text NOT NULL,
    description text,
    category text,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    image_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    online_store_visible boolean DEFAULT false,
    plant_id integer
);


ALTER TABLE public.products OWNER TO neondb_owner;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO neondb_owner;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid text NOT NULL,
    sess json NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.site_settings (
    id integer NOT NULL,
    site_title text DEFAULT 'PlantBid'::text NOT NULL,
    site_description text,
    home_page json,
    header_settings json,
    footer_settings json,
    seo_settings json,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.site_settings OWNER TO neondb_owner;

--
-- Name: site_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.site_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.site_settings_id_seq OWNER TO neondb_owner;

--
-- Name: site_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.site_settings_id_seq OWNED BY public.site_settings.id;


--
-- Name: store_locations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.store_locations (
    id integer NOT NULL,
    user_id integer NOT NULL,
    address text NOT NULL,
    region text,
    lat double precision,
    lng double precision,
    radius integer DEFAULT 5,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.store_locations OWNER TO neondb_owner;

--
-- Name: store_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.store_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.store_locations_id_seq OWNER TO neondb_owner;

--
-- Name: store_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.store_locations_id_seq OWNED BY public.store_locations.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    name text,
    phone text,
    store_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    contact_info text,
    bio text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    business_number text,
    address text,
    address_detail text,
    zip_code text,
    business_verified boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    description text,
    rating numeric(3,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    store_name text NOT NULL,
    color json,
    user_id integer
);


ALTER TABLE public.vendors OWNER TO neondb_owner;

--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vendors_id_seq OWNER TO neondb_owner;

--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: ai_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_settings ALTER COLUMN id SET DEFAULT nextval('public.ai_settings_id_seq'::regclass);


--
-- Name: bids id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bids ALTER COLUMN id SET DEFAULT nextval('public.bids_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: plants id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.plants ALTER COLUMN id SET DEFAULT nextval('public.plants_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: site_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.site_settings ALTER COLUMN id SET DEFAULT nextval('public.site_settings_id_seq'::regclass);


--
-- Name: store_locations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_locations ALTER COLUMN id SET DEFAULT nextval('public.store_locations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Name: ai_settings ai_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_settings
    ADD CONSTRAINT ai_settings_pkey PRIMARY KEY (id);


--
-- Name: bids bids_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_id_unique UNIQUE (order_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: plants plants_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: store_locations store_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_locations
    ADD CONSTRAINT store_locations_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vendors vendors_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_email_unique UNIQUE (email);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: bids bids_plant_id_plants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_plant_id_plants_id_fk FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: bids bids_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bids bids_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bids
    ADD CONSTRAINT bids_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: conversations conversations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: orders orders_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: orders orders_vendor_id_vendors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_vendor_id_vendors_id_fk FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: payments payments_bid_id_bids_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_bid_id_bids_id_fk FOREIGN KEY (bid_id) REFERENCES public.bids(id);


--
-- Name: payments payments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: products products_plant_id_plants_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_plant_id_plants_id_fk FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: products products_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: store_locations store_locations_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.store_locations
    ADD CONSTRAINT store_locations_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: vendors vendors_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

