-----------------------------------------------------------------------------
--  Copyright (c) 2014 Intel Corporation
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

--create schema in database iot
CREATE OR REPLACE FUNCTION create_schema()
RETURNS void
AS $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'dashboard')
	THEN
		CREATE SCHEMA dashboard;
    ELSE
        RAISE NOTICE 'Schema dashboard already exists';
	END IF;
END;
$$ LANGUAGE plpgsql;

SELECT * from create_schema();
--

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
    execute add_enum_if_not_exist('enum_componentTypes_type', '''actuator'',''sensor''');
    execute add_enum_if_not_exist('enum_rules_status', '''Active'',''Archived'',''Draft'',''On-hold''');
    execute add_enum_if_not_exist('enum_rules_priority', '''High'',''Low'',''Medium''');
    execute add_enum_if_not_exist('enum_rules_resetType', '''Automatic'',''Manual''');
    execute add_enum_if_not_exist('enum_devices_status', '''active'',''created''');
    execute add_enum_if_not_exist('enum_user_interaction_tokens_type', '''activate-user'',''password-reset''');
    execute add_enum_if_not_exist('enum_alerts_status', '''closed'',''New'',''Open''');
    execute add_enum_if_not_exist('enum_alerts_priority', '''High'',''Low'',''Medium''');
    execute add_enum_if_not_exist('enum_transport_type', '''mqtt'',''ws''');
    execute add_enum_if_not_exist('enum_user_type', '''system'',''user''');
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

-- accounts
CREATE TABLE IF NOT EXISTS "dashboard"."accounts" (
    "id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "healthTimePeriod" INTEGER NOT NULL,
    "exec_interval" INTEGER NOT NULL,
    "base_line_exec_interval" INTEGER NOT NULL,
    "cd_model_frequency" INTEGER NOT NULL,
    "cd_execution_frequency" INTEGER NOT NULL,
    "data_retention" INTEGER NOT NULL,
    "activation_code" CHAR(8),
    "activation_code_expire_date" TIMESTAMP WITH TIME ZONE,
    "settings" JSON, "attrs" JSON,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY ("id")
);
-- accounts end

-- users
CREATE TABLE IF NOT EXISTS "dashboard"."users" (
    "id" UUID ,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "salt" VARCHAR(255) NOT NULL,
    "termsAndConditions" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "provider" VARCHAR(255),
    "attrs" JSON,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    "type" "dashboard"."enum_user_type" DEFAULT 'user',
    PRIMARY KEY ("id")
);
-- end users

-- settings
CREATE TABLE IF NOT EXISTS "dashboard"."settings" (
    "id" UUID,
    "userId" UUID NOT NULL REFERENCES "dashboard"."users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "type" "dashboard"."enum_settings_type" NOT NULL,
    "accountId" UUID REFERENCES "dashboard"."accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "default" BOOLEAN DEFAULT false,
    "name" VARCHAR(255),
    "value" JSON NOT NULL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY ("id")
);
-- end settings

-- user_accounts
CREATE TABLE IF NOT EXISTS "dashboard"."user_accounts" (
    "role" "dashboard"."enum_user_accounts_role" NOT NULL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    "userId" UUID  REFERENCES "dashboard"."users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "accountId" UUID  REFERENCES "dashboard"."accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("userId","accountId")
);
-- end user_accounts

-- componentsTypes
CREATE TABLE IF NOT EXISTS "dashboard"."componentTypes" (
    "id" UUID NOT NULL ,
    "componentTypeId" VARCHAR(385) NOT NULL,
    "accountId" UUID REFERENCES "dashboard"."accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "dimension" VARCHAR(255) NOT NULL,
    "default" BOOLEAN NOT NULL DEFAULT false,
    "display" VARCHAR(255) NOT NULL,
    "format" VARCHAR(255) NOT NULL,
    "measureunit" VARCHAR(255),
    "version" VARCHAR(128) NOT NULL,
    "type" "dashboard"."enum_componentTypes_type" NOT NULL,
    "dataType" VARCHAR(50) NOT NULL,
    "command" JSON,
    "icon" VARCHAR(50),
    "min" DECIMAL,
    "max" DECIMAL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("componentTypeId",
    "accountId"),
    PRIMARY KEY ("id"));
-- end componentsTypes

--rules
CREATE TABLE IF NOT EXISTS "dashboard"."rules" (
    "id" UUID NOT NULL,
    "externalId" VARCHAR(40) NOT NULL,
    "accountId" UUID NOT NULL REFERENCES "dashboard"."accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "status" "dashboard"."enum_rules_status" NOT NULL,
    "name" VARCHAR(255),
    "owner" VARCHAR(255),
    "naturalLanguage" TEXT,
    "conditions" JSON,
    "actions" JSON,
    "deviceNames" VARCHAR(255)[],
    "deviceTags" VARCHAR(255)[],
    "devices" VARCHAR(255)[],
    "deviceAttributes" JSON,
    "priority" "dashboard"."enum_rules_priority",
    "resetType" "dashboard"."enum_rules_resetType",
    "type" VARCHAR(50),
    "description" TEXT,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("externalId","accountId"),
    UNIQUE ("externalId"),
    PRIMARY KEY ("id")
);

-- end rules

--complexCommands
CREATE TABLE IF NOT EXISTS "dashboard"."complexCommands" (
    "id" UUID NOT NULL ,
    "accountId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("accountId",
    "name"),
    PRIMARY KEY ("id")
    );
-- end complexCommands

--commands
CREATE TABLE IF NOT EXISTS "dashboard"."commands" (
    "id" UUID NOT NULL ,
    "complexCommandId" UUID NOT NULL REFERENCES "dashboard"."complexCommands" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "componentId" VARCHAR(255) NOT NULL,
    "transport" "dashboard"."enum_transport_type" NOT NULL,
    "parameters" JSON NOT NULL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    "accountId" UUID NOT NULL REFERENCES "dashboard"."accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY ("id")
);
-- end commands

--devices
CREATE TABLE IF NOT EXISTS "dashboard"."devices" (
    "id" VARCHAR(255) ,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "gatewayId" VARCHAR(255) NOT NULL,
    "accountId" UUID NOT NULL REFERENCES "dashboard"."accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "loc" DECIMAL[],
    "email" VARCHAR(255),
    "phone" VARCHAR(255),
    "status" "dashboard"."enum_devices_status" NOT NULL DEFAULT 'created',
    "lastVisit" TIMESTAMP WITH TIME ZONE,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY ("id")
);
--end devices

--device_attributes
CREATE TABLE IF NOT EXISTS "dashboard"."device_attributes" (
    "id" UUID ,
    "deviceId" VARCHAR(255) NOT NULL REFERENCES "dashboard"."devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "key" VARCHAR(255) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("deviceId",
    "key"),
    PRIMARY KEY ("id")
);
--end device_attributes

-- device_tags
CREATE TABLE IF NOT EXISTS "dashboard"."device_tags" (
    "id" UUID ,
    "deviceId" VARCHAR(255) NOT NULL REFERENCES "dashboard"."devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "value" VARCHAR(255) NOT NULL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("deviceId","value"),
    PRIMARY KEY ("id")
);
-- end device_tags

--invites
CREATE TABLE IF NOT EXISTS "dashboard"."invites" (
    "id" UUID ,
    "accountId" UUID NOT NULL REFERENCES "dashboard"."accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "email" VARCHAR(255) NOT NULL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("accountId","email"),
    PRIMARY KEY ("id")
);
--end invites

--device_components
CREATE TABLE IF NOT EXISTS "dashboard"."device_components" (
    "componentId" VARCHAR(255) ,
    "name" VARCHAR(255) NOT NULL,
    "componentTypeId" UUID NOT NULL REFERENCES "dashboard"."componentTypes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "deviceId" VARCHAR(255) NOT NULL REFERENCES "dashboard"."devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "last_observation_time" TIMESTAMP WITH TIME ZONE DEFAULT to_timestamp(0),
    "last_export_date" TIMESTAMP WITH TIME ZONE DEFAULT to_timestamp(0),
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("deviceId","name"),
    PRIMARY KEY ("componentId")
);

--end device_components
--
CREATE TABLE IF NOT EXISTS "dashboard"."rule_executions" (
    "id" UUID,
    "start" TIMESTAMP WITH TIME ZONE NOT NULL,
    "last_observation_time" TIMESTAMP WITH TIME ZONE,
    "rule_id" UUID NOT NULL REFERENCES "dashboard"."rules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "device_component_id" VARCHAR(255) NOT NULL REFERENCES "dashboard"."device_components" ("componentId") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE ("rule_id", "device_component_id"),
    PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dashboard"."device_component_missing_export_days" (
    "componentId" VARCHAR(255) REFERENCES "dashboard"."device_components" ("componentId") ON DELETE CASCADE ON UPDATE CASCADE,
    "day" TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY ("componentId", "day")
);
--alerts

CREATE TABLE IF NOT EXISTS "dashboard"."alerts" (
    "id" UUID NOT NULL ,
    "accountId" UUID NOT NULL REFERENCES "dashboard"."accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "externalId" VARCHAR(40) NOT NULL REFERENCES "dashboard"."rules" ("externalId") ON DELETE CASCADE ON UPDATE CASCADE,
    "deviceId" VARCHAR(255) NOT NULL REFERENCES "dashboard"."devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "reset" TIMESTAMP WITH TIME ZONE,
    "triggered" TIMESTAMP WITH TIME ZONE,
    "status" "dashboard"."enum_alerts_status" NOT NULL DEFAULT 'New',
    "ruleName" VARCHAR(255),
    "priority" "dashboard"."enum_alerts_priority",
    "naturalLangAlert" TEXT,
    "conditions" JSON,
    "resetType" "dashboard"."enum_alert_reset_type",
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY ("id")
);

--end alerts

--actuations

CREATE TABLE IF NOT EXISTS "dashboard"."actuations" (
    "id" UUID NOT NULL ,
    "componentId" VARCHAR(255) NOT NULL REFERENCES "dashboard"."device_components" ("componentId") ON DELETE CASCADE ON UPDATE CASCADE,
    "transport" "dashboard"."enum_transport_type",
    "parameters" VARCHAR(50),
    "conditions" JSON,
    "command" VARCHAR(255),
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY ("id")
);

--end actuations

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

--user_interaction_tokens table
CREATE TABLE IF NOT EXISTS "dashboard"."user_interaction_tokens" (
    "id" CHAR(16) ,
    "userId" UUID NOT NULL REFERENCES "dashboard"."users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "type" "dashboard"."enum_user_interaction_tokens_type" NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("userId", "type"),
    PRIMARY KEY ("id")
);
--end user_interaction_tokens

CREATE TABLE IF NOT EXISTS "dashboard"."connectionBindings" (
    "id" UUID ,
    "deviceId" VARCHAR(255) NOT NULL REFERENCES "dashboard"."devices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "lastConnectedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "server" VARCHAR(255) NOT NULL,
    "connectingStatus" BOOLEAN NOT NULL DEFAULT false,
    "type" "dashboard"."enum_transport_type" NOT NULL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("deviceId", "type"),
    PRIMARY KEY ("id")
);


CREATE TABLE IF NOT EXISTS "dashboard"."purchased_limits" (
    "id" UUID ,
    "accountId" UUID NOT NULL REFERENCES "dashboard"."accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "route" VARCHAR(255) ,
    "method" VARCHAR(255) NOT NULL,
    "limit" BIGINT NOT NULL,
    "created" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated" TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE ("accountId", "route", "method"),
    PRIMARY KEY ("id")
);

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

CREATE OR REPLACE FUNCTION create_indexes()
RETURNS void
AS $$
BEGIN

    execute add_index_if_not_exist('accounts_activation_code_index', 'accounts', 'activation_code');
    execute add_index_if_not_exist('device_components_componentTypeId_index', 'device_components', 'componentTypeId');
    execute add_index_if_not_exist('device_components_deviceId_index', 'device_components', 'deviceId');
    execute add_index_if_not_exist('device_components_name_index', 'device_components', 'name","deviceId');
    execute add_index_if_not_exist('invites_email_index', 'invites', 'email');
    execute add_index_if_not_exist('invites_email_index', 'invites', 'email');
    execute add_index_if_not_exist('devicetags_deviceId_index', 'device_tags', 'deviceId');
    execute add_index_if_not_exist('invites_account_index', 'invites', 'accountId');
    execute add_index_if_not_exist('deviceAttributes_deviceId_index', 'device_attributes', 'deviceId');
    execute add_index_if_not_exist('devices_id_accountId_index', 'devices', 'id","accountId');
    execute add_index_if_not_exist('devices_accountId_index', 'devices', 'accountId');
    execute add_index_if_not_exist('commands_componentId_index', 'commands', 'componentId');
    execute add_index_if_not_exist('complexCommands_accountId_index', 'complexCommands', 'accountId');
    execute add_index_if_not_exist('rules_accountId_index', 'rules', 'accountId');
    execute add_index_if_not_exist('componentTypes_accountId_index', 'componentTypes', 'accountId');
    execute add_index_if_not_exist('settings_account_index', 'settings', 'accountId');
    execute add_index_if_not_exist('settings_user_index', 'settings', 'userId');
    execute add_index_if_not_exist('alerts_accountId_index', 'alerts', 'accountId');
    execute add_index_if_not_exist('alerts_externalRuleId_index', 'alerts', 'externalId');
    execute add_index_if_not_exist('alerts_deviceId_index', 'alerts', 'deviceId');
    execute add_index_if_not_exist('alerts_status_index', 'alerts', 'status');

    execute add_index_if_not_exist('connectionBindings_deviceId_index', 'connectionBindings', 'deviceId');
    execute add_index_if_not_exist('connectionBindings_type_index', 'connectionBindings', 'type');

    execute add_index_if_not_exist('rule_executions_rule_id_index', 'rule_executions', 'rule_id');
END;
$$ LANGUAGE plpgsql;

SELECT * from create_indexes();
--end adding indexes

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
drop function create_schema();



