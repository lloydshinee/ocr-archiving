-- =============================================================================
-- CCS Archive — Full Database Schema
-- Generated from local Supabase instance
-- Run this on your production Supabase SQL Editor (or via psql)
-- =============================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Enum types
CREATE TYPE public.user_role AS ENUM ('dean', 'program_head', 'faculty', 'student_assistant');

-- 2. Tables
-- (ordered to respect foreign keys)

-- Programs
CREATE TABLE public.programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Users (extends Supabase Auth)
CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    role public.user_role NOT NULL,
    program_id uuid,
    is_deactivated boolean DEFAULT false NOT NULL,
    deactivated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);

-- Categories
CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Document types
CREATE TABLE public.document_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tags
CREATE TABLE public.tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Folders
CREATE TABLE public.folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    program_id uuid,
    category_id uuid,
    owner_id uuid NOT NULL,
    inherit_permissions boolean DEFAULT true NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    locked_by uuid,
    locked_at timestamp with time zone,
    is_archived boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    archived_by uuid,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    db_previously_archived boolean DEFAULT false,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, COALESCE(name, ''::text))) STORED
);

-- Documents
CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    folder_id uuid NOT NULL,
    category_id uuid,
    document_type_id uuid,
    owner_id uuid NOT NULL,
    file_name text NOT NULL,
    file_size bigint NOT NULL,
    file_type text NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    archived_by uuid,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    current_version_id uuid,
    db_previously_archived boolean DEFAULT false,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig,
        (COALESCE(title, ''::text) || ' '::text) || COALESCE(description, ''::text))) STORED
);

-- Document versions
CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    version_number integer NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    file_type text NOT NULL,
    ocr_text text,
    ocr_status text DEFAULT 'pending'::text NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig,
        COALESCE(ocr_text, ''::text))) STORED,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Permissions
CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    folder_id uuid,
    document_id uuid,
    actions text[] NOT NULL,
    assigned_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT permissions_target_check CHECK (
        ((folder_id IS NOT NULL) AND (document_id IS NULL))
        OR ((folder_id IS NULL) AND (document_id IS NOT NULL))
    )
);

-- Document-tag junction
CREATE TABLE public.document_tags (
    document_id uuid NOT NULL,
    tag_id uuid NOT NULL
);

-- Comments
CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.comments REPLICA IDENTITY FULL;

-- Notifications
CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    resource_type text,
    resource_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;

-- Audit logs
CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- OCR jobs
CREATE TABLE public.ocr_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version_id uuid NOT NULL,
    document_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    retry_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT ocr_jobs_status_check CHECK (
        status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])
    )
);

-- 3. Primary keys & unique constraints
ALTER TABLE ONLY public.programs ADD CONSTRAINT programs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.programs ADD CONSTRAINT programs_name_key UNIQUE (name);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_name_key UNIQUE (name);
ALTER TABLE ONLY public.document_types ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.document_types ADD CONSTRAINT document_types_name_key UNIQUE (name);
ALTER TABLE ONLY public.tags ADD CONSTRAINT tags_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tags ADD CONSTRAINT tags_name_key UNIQUE (name);
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.document_versions ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.permissions ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.document_tags ADD CONSTRAINT document_tags_pkey PRIMARY KEY (document_id, tag_id);
ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ocr_jobs ADD CONSTRAINT ocr_jobs_pkey PRIMARY KEY (id);

-- 4. Foreign keys
-- Users
ALTER TABLE ONLY public.users ADD CONSTRAINT users_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Folders
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.folders(id);
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id);
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.folders ADD CONSTRAINT folders_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id);

-- Documents
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id);
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES public.document_types(id);
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES public.document_versions(id);
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.documents ADD CONSTRAINT documents_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

-- Document versions
ALTER TABLE ONLY public.document_versions ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);
ALTER TABLE ONLY public.document_versions ADD CONSTRAINT document_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Document tags
ALTER TABLE ONLY public.document_tags ADD CONSTRAINT document_tags_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.document_tags ADD CONSTRAINT document_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;

-- Comments
ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);
ALTER TABLE ONLY public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Notifications
ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Audit logs
ALTER TABLE ONLY public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Permissions
ALTER TABLE ONLY public.permissions ADD CONSTRAINT permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.permissions ADD CONSTRAINT permissions_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id);
ALTER TABLE ONLY public.permissions ADD CONSTRAINT permissions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);
ALTER TABLE ONLY public.permissions ADD CONSTRAINT permissions_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);

-- OCR jobs
ALTER TABLE ONLY public.ocr_jobs ADD CONSTRAINT ocr_jobs_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.document_versions(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.ocr_jobs ADD CONSTRAINT ocr_jobs_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;

-- 5. Indexes
CREATE INDEX idx_users_program_id ON public.users USING btree (program_id);
CREATE INDEX idx_folders_parent_id ON public.folders USING btree (parent_id);
CREATE INDEX idx_folders_program_id ON public.folders USING btree (program_id);
CREATE INDEX idx_folders_owner_id ON public.folders USING btree (owner_id);
CREATE INDEX idx_folders_category_id ON public.folders USING btree (category_id);
CREATE INDEX idx_folders_deleted_at ON public.folders USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_folders_search_vector ON public.folders USING gin (search_vector);
CREATE INDEX idx_documents_folder_id ON public.documents USING btree (folder_id);
CREATE INDEX idx_documents_owner_id ON public.documents USING btree (owner_id);
CREATE INDEX idx_documents_category_id ON public.documents USING btree (category_id);
CREATE INDEX idx_documents_document_type_id ON public.documents USING btree (document_type_id);
CREATE INDEX idx_documents_deleted_at ON public.documents USING btree (deleted_at) WHERE (deleted_at IS NULL);
CREATE INDEX idx_documents_search_vector ON public.documents USING gin (search_vector);
CREATE INDEX idx_document_versions_document_id ON public.document_versions USING btree (document_id);
CREATE INDEX idx_document_versions_created_by ON public.document_versions USING btree (created_by);
CREATE INDEX idx_document_versions_search ON public.document_versions USING gin (search_vector);
CREATE INDEX idx_document_versions_search_vector ON public.document_versions USING gin (search_vector);
CREATE UNIQUE INDEX idx_document_versions_unique_number ON public.document_versions USING btree (document_id, version_number);
CREATE INDEX idx_permissions_user_id ON public.permissions USING btree (user_id);
CREATE INDEX idx_permissions_folder_id ON public.permissions USING btree (folder_id);
CREATE INDEX idx_permissions_document_id ON public.permissions USING btree (document_id);
CREATE INDEX idx_comments_document_id ON public.comments USING btree (document_id);
CREATE INDEX idx_comments_user_id ON public.comments USING btree (user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, created_at) WHERE (is_read = false);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_ocr_jobs_status ON public.ocr_jobs USING btree (status, created_at);

-- 6. Functions

-- Update updated_at on row change
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Auto-create user profile on auth signup
CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
        'faculty'
    );
    RETURN NEW;
END;
$$;

-- Folder breadcrumb path
CREATE FUNCTION public.get_folder_path(p_folder_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_path TEXT := '';
    v_current_id UUID := p_folder_id;
    v_name TEXT;
    v_parent_id UUID;
BEGIN
    WHILE v_current_id IS NOT NULL LOOP
        SELECT name, parent_id INTO v_name, v_parent_id
        FROM folders
        WHERE id = v_current_id AND deleted_at IS NULL;
        EXIT WHEN v_name IS NULL;
        IF v_path = '' THEN
            v_path := v_name;
        ELSE
            v_path := v_name || ' / ' || v_path;
        END IF;
        v_current_id := v_parent_id;
    END LOOP;
    RETURN v_path;
END;
$$;

-- Get program folder subtree (recursive)
CREATE FUNCTION public.get_program_folder_subtree(p_program_id uuid) RETURNS SETOF public.folders
    LANGUAGE sql STABLE AS $$
    WITH RECURSIVE folder_tree AS (
        SELECT f.* FROM public.folders f
        WHERE f.program_id = p_program_id AND f.parent_id IS NULL AND f.deleted_at IS NULL
        UNION ALL
        SELECT f.* FROM public.folders f
        JOIN folder_tree ft ON f.parent_id = ft.id
        WHERE f.deleted_at IS NULL
    )
    SELECT * FROM folder_tree;
$$;

-- Check effective permission with ancestor walk
CREATE FUNCTION public.get_effective_permissions(
    p_folder_id uuid,
    p_user_id uuid,
    p_action text
) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO '' AS $$
DECLARE
    v_folder_id uuid;
    v_owner_id uuid;
    v_program_id uuid;
    v_inherit boolean;
    v_user_role text;
    v_actions text[];
BEGIN
    SELECT role INTO v_user_role FROM public.users WHERE id = p_user_id;
    IF v_user_role = 'dean' THEN RETURN true; END IF;

    SELECT id, owner_id, program_id, inherit_permissions
    INTO v_folder_id, v_owner_id, v_program_id, v_inherit
    FROM public.folders WHERE id = p_folder_id;
    IF v_folder_id IS NULL THEN RETURN false; END IF;
    IF v_owner_id = p_user_id THEN RETURN true; END IF;

    IF v_user_role = 'program_head' AND v_program_id IS NOT NULL THEN
        PERFORM 1 FROM public.users u
        WHERE u.id = p_user_id AND u.program_id = v_program_id;
        IF FOUND THEN RETURN true; END IF;
    END IF;

    WHILE v_folder_id IS NOT NULL LOOP
        SELECT id, owner_id, program_id, inherit_permissions, parent_id
        INTO v_folder_id, v_owner_id, v_program_id, v_inherit, v_folder_id
        FROM public.folders WHERE id = v_folder_id;
        IF v_inherit = false THEN
            SELECT actions INTO v_actions FROM public.permissions
            WHERE folder_id = v_folder_id AND user_id = p_user_id;
            IF v_actions IS NOT NULL AND p_action = ANY(v_actions) THEN RETURN true; END IF;
            RETURN false;
        END IF;
    END LOOP;

    SELECT actions INTO v_actions FROM public.permissions
    WHERE folder_id = p_folder_id AND user_id = p_user_id;
    RETURN v_actions IS NOT NULL AND p_action = ANY(v_actions);
END;
$$;

-- Get folder IDs a user can view
CREATE FUNCTION public.get_user_permitted_folder_ids(p_user_id uuid) RETURNS SETOF uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO '' AS $$
    WITH user_info AS (
        SELECT role, program_id FROM public.users WHERE id = p_user_id
    )
    SELECT f.id FROM public.folders f, user_info u
    WHERE u.role = 'dean'
        OR (u.role = 'program_head' AND f.program_id = u.program_id)
        OR f.owner_id = p_user_id
    UNION
    SELECT f.id FROM public.folders f
    WHERE EXISTS (
        SELECT 1 FROM public.permissions p
        WHERE p.folder_id = f.id AND p.user_id = p_user_id AND 'view' = ANY(p.actions)
    );
$$;

-- Full-text search across folders and documents
CREATE FUNCTION public.search_archives(
    p_query text,
    p_category_id uuid DEFAULT NULL::uuid,
    p_document_type_id uuid DEFAULT NULL::uuid,
    p_owner_id uuid DEFAULT NULL::uuid,
    p_date_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_date_to timestamp with time zone DEFAULT NULL::timestamp with time zone,
    p_file_type text DEFAULT NULL::text,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0,
    p_include_archived boolean DEFAULT false
) RETURNS TABLE(
    id uuid, result_type text, title text, description text,
    folder_id uuid, folder_path text,
    created_at timestamp with time zone, updated_at timestamp with time zone,
    owner_id uuid, owner_name text,
    file_type text, file_size bigint, ocr_status text,
    match_headline text, rank real,
    is_archived boolean
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_ts_query tsquery;
BEGIN
    v_ts_query := plainto_tsquery('english', p_query);

    RETURN QUERY
    WITH folder_results AS (
        SELECT
            f.id, 'folder'::TEXT AS result_type,
            f.name AS title, NULL::TEXT AS description,
            f.id AS folder_id, get_folder_path(f.parent_id) AS folder_path,
            f.created_at, f.updated_at,
            f.owner_id, u.full_name AS owner_name,
            NULL::TEXT AS file_type, NULL::BIGINT AS file_size, NULL::TEXT AS ocr_status,
            ts_headline('english', f.name, v_ts_query, 'StartSel=<mark>, StopSel=</mark>') AS match_headline,
            ts_rank(f.search_vector, v_ts_query) AS rank,
            f.is_archived
        FROM folders f
        JOIN users u ON u.id = f.owner_id
        WHERE f.deleted_at IS NULL
            AND f.search_vector @@ v_ts_query
            AND (p_category_id IS NULL OR f.category_id = p_category_id)
    ),
    document_results AS (
        SELECT
            d.id, 'document'::TEXT AS result_type,
            d.title, d.description,
            d.folder_id, get_folder_path(d.folder_id) AS folder_path,
            d.created_at, d.updated_at,
            d.owner_id, u.full_name AS owner_name,
            d.file_type, d.file_size::BIGINT, dv.ocr_status,
            ts_headline('english',
                COALESCE(d.title, '') || ' ' || COALESCE(d.description, '')
                || ' ' || COALESCE(dv.ocr_text, ''),
                v_ts_query, 'StartSel=<mark>, StopSel=</mark>'
            ) AS match_headline,
            GREATEST(
                ts_rank(d.search_vector, v_ts_query),
                COALESCE(ts_rank(dv.search_vector, v_ts_query), 0)
            ) AS rank,
            d.is_archived
        FROM documents d
        JOIN users u ON u.id = d.owner_id
        LEFT JOIN document_versions dv ON dv.id = d.current_version_id
        WHERE d.deleted_at IS NULL
            AND (p_include_archived OR d.is_archived = false)
            AND (
                d.search_vector @@ v_ts_query
                OR (dv.id IS NOT NULL AND dv.search_vector @@ v_ts_query)
                OR EXISTS (
                    SELECT 1 FROM document_tags dt
                    JOIN tags t ON t.id = dt.tag_id
                    WHERE dt.document_id = d.id
                    AND to_tsvector('english', t.name) @@ v_ts_query
                )
            )
            AND (p_category_id IS NULL OR d.category_id = p_category_id)
            AND (p_document_type_id IS NULL OR d.document_type_id = p_document_type_id)
            AND (p_owner_id IS NULL OR d.owner_id = p_owner_id)
            AND (p_date_from IS NULL OR d.created_at >= p_date_from)
            AND (p_date_to IS NULL OR d.created_at <= p_date_to)
            AND (p_file_type IS NULL OR d.file_type ILIKE '%' || p_file_type || '%')
    ),
    combined AS (
        SELECT * FROM folder_results
        UNION ALL
        SELECT * FROM document_results
    )
    SELECT * FROM combined
    ORDER BY rank DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Cleanup expired deleted items (30-day retention)
CREATE FUNCTION public.cleanup_deleted_items()
RETURNS TABLE(item_type text, item_id uuid, item_name text)
    LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_days integer := 30;
    v_cutoff timestamptz := NOW() - (v_days || ' days')::interval;
    v_folder record;
    v_doc record;
    v_deleted_folders uuid[];
    v_deleted_docs uuid[];
BEGIN
    WITH deleted_docs AS (
        SELECT id, title, COALESCE(archived_by, deleted_by) AS actor_id
        FROM public.documents
        WHERE deleted_at IS NOT NULL AND deleted_at < v_cutoff
    )
    SELECT array_agg(dd.id) INTO v_deleted_docs FROM deleted_docs dd;

    IF v_deleted_docs IS NOT NULL AND array_length(v_deleted_docs, 1) > 0 THEN
        DELETE FROM public.document_tags WHERE document_id = ANY(v_deleted_docs);
        DELETE FROM public.document_versions WHERE document_id = ANY(v_deleted_docs);
        DELETE FROM public.comments WHERE document_id = ANY(v_deleted_docs);
        DELETE FROM public.permissions WHERE document_id = ANY(v_deleted_docs);
        DELETE FROM public.notifications WHERE resource_type = 'document' AND resource_id = ANY(v_deleted_docs);

        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        SELECT COALESCE(d.deleted_by, d.archived_by, '00000000-0000-0000-0000-000000000000'::uuid),
            'permanent_delete', 'document', d.id,
            jsonb_build_object('title', d.title, 'deleted_at', d.deleted_at, 'reason', '30-day expiry')
        FROM public.documents d WHERE d.id = ANY(v_deleted_docs);

        DELETE FROM public.documents WHERE id = ANY(v_deleted_docs);
    END IF;

    FOR v_folder IN
        SELECT f.id, f.name, array_length(string_to_array(f_path.path, '/'), 1) AS depth,
               COALESCE(f.deleted_by, f.archived_by) AS actor_id
        FROM public.folders f,
             LATERAL (
                WITH RECURSIVE path AS (
                    SELECT f2.id, f2.parent_id, 1 AS depth, f2.id::text AS path
                    FROM public.folders f2 WHERE f2.id = f.id
                    UNION ALL
                    SELECT f3.id, f3.parent_id, p.depth + 1, f3.id::text || '/' || p.path::text
                    FROM public.folders f3 JOIN path p ON f3.id = p.parent_id
                )
                SELECT p.path FROM path p ORDER BY p.depth DESC LIMIT 1
             ) f_path
        WHERE f.deleted_at IS NOT NULL AND f.deleted_at < v_cutoff
        ORDER BY depth DESC
    LOOP
        DELETE FROM public.permissions WHERE folder_id = v_folder.id;
        DELETE FROM public.notifications WHERE resource_type = 'folder' AND resource_id = v_folder.id;

        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (
            COALESCE(v_folder.actor_id, '00000000-0000-0000-0000-000000000000'::uuid),
            'permanent_delete', 'folder', v_folder.id,
            jsonb_build_object('name', v_folder.name, 'deleted_at', v_cutoff, 'reason', '30-day expiry')
        );

        DELETE FROM public.folders WHERE id = v_folder.id;

        item_type := 'folder';
        item_id := v_folder.id;
        item_name := v_folder.name;
        RETURN NEXT;
    END LOOP;
END;
$$;

-- 7. Triggers

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_document_types_updated_at BEFORE UPDATE ON public.document_types
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_folders_updated_at BEFORE UPDATE ON public.folders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_programs_updated_at BEFORE UPDATE ON public.programs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create user profile when someone signs up via Supabase Auth
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Row-Level Security policies
-- Note: The app primarily uses service-role API routes for access control.
-- RLS here is a defence-in-depth layer for direct DB access.

-- Public lookup tables: any authenticated user can read
CREATE POLICY "Authenticated users can read categories" ON public.categories
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read document_tags" ON public.document_tags
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read document_types" ON public.document_types
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read programs" ON public.programs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read tags" ON public.tags
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read users" ON public.users
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));

-- Folders: Dean sees all, others see owned + permitted + program folders
CREATE POLICY "Users can read folders they have access to" ON public.folders
    FOR SELECT TO authenticated USING (
        (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'dean'))
        OR (owner_id = auth.uid())
        OR (EXISTS (SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'program_head' AND u.program_id = folders.program_id))
        OR (EXISTS (SELECT 1 FROM public.permissions p
            WHERE p.folder_id = folders.id AND p.user_id = auth.uid() AND 'view' = ANY(p.actions)))
    );

-- Documents: Dean sees all, others see owned + permitted + via folder access
CREATE POLICY "Users can read documents they have access to" ON public.documents
    FOR SELECT TO authenticated USING (
        (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'dean'))
        OR (owner_id = auth.uid())
        OR (EXISTS (SELECT 1 FROM public.permissions p
            WHERE p.document_id = documents.id AND p.user_id = auth.uid() AND 'view' = ANY(p.actions)))
        OR ((folder_id IS NOT NULL) AND (EXISTS (
            SELECT 1 FROM public.folders f WHERE f.id = documents.folder_id AND (
                f.owner_id = auth.uid()
                OR (EXISTS (SELECT 1 FROM public.users u
                    WHERE u.id = auth.uid() AND u.role = 'program_head' AND u.program_id = f.program_id))
                OR (EXISTS (SELECT 1 FROM public.permissions p
                    WHERE p.folder_id = f.id AND p.user_id = auth.uid() AND 'view' = ANY(p.actions)))
            ))))
    );

-- Document versions: owner or dean
CREATE POLICY "Users can read versions of accessible documents" ON public.document_versions
    FOR SELECT TO authenticated USING (
        (EXISTS (SELECT 1 FROM public.documents d
            WHERE d.id = document_versions.document_id AND d.owner_id = auth.uid()))
        OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'dean'))
    );

-- Comments: scoped to viewable documents
CREATE POLICY "Users can read comments on viewable documents" ON public.comments
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.documents d WHERE d.id = comments.document_id
            AND d.deleted_at IS NULL AND (
                d.owner_id = auth.uid()
                OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid()
                    AND u.role = ANY (ARRAY['dean', 'program_head'])
                    AND (u.role = 'dean' OR EXISTS (
                        SELECT 1 FROM public.folders f WHERE f.id = d.folder_id AND f.program_id = u.program_id
                    ))))
                OR (EXISTS (SELECT 1 FROM public.permissions p
                    WHERE p.folder_id = d.folder_id AND p.user_id = auth.uid() AND p.actions @> ARRAY['view']))
                OR (EXISTS (SELECT 1 FROM public.permissions p
                    WHERE p.document_id = d.id AND p.user_id = auth.uid() AND p.actions @> ARRAY['view']))
            ))
    );

CREATE POLICY "Users can insert comments on viewable documents" ON public.comments
    FOR INSERT TO authenticated WITH CHECK (
        user_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.documents d WHERE d.id = comments.document_id
            AND d.deleted_at IS NULL AND (
                d.owner_id = auth.uid()
                OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid()
                    AND u.role = ANY (ARRAY['dean', 'program_head'])
                    AND (u.role = 'dean' OR EXISTS (
                        SELECT 1 FROM public.folders f WHERE f.id = d.folder_id AND f.program_id = u.program_id
                    ))))
                OR (EXISTS (SELECT 1 FROM public.permissions p
                    WHERE p.folder_id = d.folder_id AND p.user_id = auth.uid() AND p.actions @> ARRAY['view']))
                OR (EXISTS (SELECT 1 FROM public.permissions p
                    WHERE p.document_id = d.id AND p.user_id = auth.uid() AND p.actions @> ARRAY['view']))
            ))
    );

CREATE POLICY "Users can delete own comments, Dean can delete any" ON public.comments
    FOR DELETE TO authenticated USING (
        (user_id = auth.uid())
        OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'dean'))
    );

-- Permissions: users see their own
CREATE POLICY "Users can read their own permissions" ON public.permissions
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Notifications: users see and update their own
CREATE POLICY "Users can see their own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Audit logs: Dean and Program Head only
CREATE POLICY "Dean and PH can read audit_logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND (u.role = 'dean' OR u.role = 'program_head'))
    );

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket policies
CREATE POLICY "Authenticated users can read documents" ON storage.objects
    FOR SELECT USING ((bucket_id = 'documents'::text) AND (auth.role() = 'authenticated'::text));
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
    FOR INSERT WITH CHECK ((bucket_id = 'documents'::text) AND (auth.role() = 'authenticated'::text));

-- 10. Realtime publication (for live comments & notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
