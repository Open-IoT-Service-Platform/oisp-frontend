-----------------------------------------------------------------------------
--  Copyright (c) 2019 Intel Corporation
--
--  Licensed under the Apache License, Version 2.0 (the "License");
--  you may not use this file except in compliance with the License.
--  You may obtain a copy of the License at
--
--      http://www.apache.org/licenses/LICENSE-2.0
--
--  Unless required by applicable law or agreed to in writing, software
--  distributed under the License is distributed on an "AS IS" BASIS,
--  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
--  See the License for the specific language governing permissions and
--  limitations under the License.
-----------------------------------------------------------------------------

--Create enums for all tables
CREATE OR REPLACE FUNCTION add_enum_if_not_exist(name varchar(100), enum_values varchar(100))
RETURNS void
AS $$
DECLARE
BEGIN
    IF NOT EXISTS (
        SELECT * FROM pg_type
        WHERE typname = name)
    THEN
	EXECUTE 'CREATE TYPE "dashboard"."' || (name) || '" AS ENUM (' || enum_values || ')';
        RAISE NOTICE 'Enum - % created', name;
    ELSE
        RAISE NOTICE 'Enum - % already exists', name;
    END IF;
END;
$$ LANGUAGE plpgsql;
--
CREATE OR REPLACE FUNCTION create_enum_types()
RETURNS void
AS $$
BEGIN
    execute add_enum_if_not_exist('enum_settings_type', '''global'',''dashboard'',''favorite''');
    execute add_enum_if_not_exist('enum_user_accounts_role', '''admin'',''user''');
    execute add_enum_if_not_exist('enum_component_types_type', '''actuator'',''sensor''');
    execute add_enum_if_not_exist('enum_rules_status', '''Active'',''Archived'',''Draft'',''On-hold''');
    execute add_enum_if_not_exist('enum_rules_priority', '''High'',''Low'',''Medium''');
    execute add_enum_if_not_exist('enum_rules_resetType', '''Automatic'',''Manual''');
    execute add_enum_if_not_exist('enum_devices_status', '''active'',''created''');
    execute add_enum_if_not_exist('enum_user_interaction_tokens_type', '''activate-user'',''password-reset''');
    execute add_enum_if_not_exist('enum_alerts_status', '''closed'',''New'',''Open''');
    execute add_enum_if_not_exist('enum_alerts_priority', '''High'',''Low'',''Medium''');
    execute add_enum_if_not_exist('enum_transport_type', '''mqtt'',''ws''');
    execute add_enum_if_not_exist('enum_connectionBindings_type', '''mqtt'',''ws''');
    execute add_enum_if_not_exist('enum_users_type', '''system'',''user''');
    execute add_enum_if_not_exist('enum_alert_reset_type', '''Automatic'',''Manual''');
    execute add_enum_if_not_exist('enum_sync_status', '''NotSync'',''Sync''');

    IF NOT EXISTS (
        SELECT * FROM pg_type
        WHERE typname = 'device_components_type')
    THEN
        CREATE TYPE "dashboard"."device_components_type" AS ("componentId" varchar(255), name varchar(255), "componentType" varchar(255), "deviceId" varchar(255));
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT * from create_enum_types();

--deviceAttributesView
CREATE OR REPLACE VIEW "dashboard"."deviceAttributesView" AS
	SELECT da.key, da.value, d.id as "deviceId", d."accountId"
	FROM "dashboard"."devices" d RIGHT JOIN "dashboard"."device_attributes" as da on d.id = da."deviceId";

--deviceTagsView
CREATE OR REPLACE VIEW "dashboard"."deviceTagsView" AS
	SELECT dt.value, d.id as "deviceId", d."accountId"
	FROM "dashboard"."devices" d RIGHT JOIN "dashboard"."device_tags" as dt on d.id = dt."deviceId";

--create complex constraints for settings table
CREATE OR REPLACE FUNCTION create_settings_constraints()
RETURNS void
AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'settings_global_unique')
	THEN
		CREATE UNIQUE INDEX settings_global_unique ON "dashboard"."settings" ("userId") WHERE type = 'global';
		RAISE NOTICE 'settings_global_unique constraint added';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'settings_dashboard_unique')
    THEN
        CREATE UNIQUE INDEX settings_dashboard_unique ON "dashboard"."settings" ("userId", "accountId") WHERE type = 'dashboard';
        RAISE NOTICE 'settings_dashboard_unique constraint added';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'settings_favorite_unique')
    THEN
        CREATE UNIQUE INDEX settings_favorite_unique ON "dashboard"."settings" ("userId", "accountId", name) WHERE type = 'favorite';
        RAISE NOTICE 'settings_favorite_unique constraint added';
    END IF;
END;
$$ LANGUAGE plpgsql;

select * from create_settings_constraints();

--Add indexes for all tables
CREATE OR REPLACE FUNCTION add_index_if_not_exist(name varchar(100), table_name varchar(100), column_name varchar(100))
RETURNS void
AS $$
DECLARE
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class WHERE relname = name)
    THEN
	EXECUTE 'CREATE INDEX "' || (name) || '" ON "dashboard"."' || table_name || '" USING BTREE ("' || column_name || '")';
        RAISE NOTICE 'Index - % created', name;
    ELSE
        RAISE NOTICE 'Index - % already exists', name;
    END IF;
END;
$$ LANGUAGE plpgsql;
--

CREATE OR REPLACE FUNCTION revoke_all_privileges()
RETURNS void
AS $$
BEGIN
   REVOKE ALL ON DATABASE template0 FROM PUBLIC;
   REVOKE ALL ON DATABASE template1 FROM PUBLIC;

   --Remove privileges to access any schema for non-admin users
   REVOKE ALL ON schema public from public;
   REVOKE ALL ON schema dashboard from public;

   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
   REVOKE ALL ON ALL TABLES IN SCHEMA dashboard FROM PUBLIC;
   RAISE NOTICE 'All privileges has been revoked';
END;
$$ LANGUAGE plpgsql;

SELECT * from revoke_all_privileges();

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA dashboard;

drop function add_enum_if_not_exist(varchar(100), varchar(100));
drop function revoke_all_privileges();
drop function create_enum_types();
drop function create_settings_constraints();
