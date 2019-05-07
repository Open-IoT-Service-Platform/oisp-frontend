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

CREATE OR REPLACE FUNCTION dashboard.add_device_components(components "dashboard".device_components_type[], dev_id varchar(255), account_id varchar(255))
    RETURNS TABLE(
        "id" varchar(255),
        "name" varchar(255),
        "description" varchar(255),
        "gatewayId" varchar(255),
        "loc" numeric[],
        "status" dashboard.enum_devices_status,
        "attribute_id" uuid,
        "attribute_key" varchar(255),
        "attribute_value" varchar(255),
        "tag_id" uuid,
        "tag_value" varchar(255),
        "deviceComponent_componentId" varchar(255),
        "deviceComponent_name" varchar(255),
        "deviceComponent_componentTypeId" uuid,
        "deviceComponent_componentType_componentTypeId" varchar(385),
        "deviceComponent_componentType_accountId"  uuid,
        "deviceComponent_componentType_dimension" varchar(255),
        "deviceComponent_componentType_default" boolean,
        "deviceComponent_componentType_display" varchar(255),
        "deviceComponent_componentType_format" varchar(255),
        "deviceComponent_componentType_measureunit" varchar(255),
        "deviceComponent_componentType_version" varchar(128),
        "deviceComponent_componentType_type" "dashboard"."enum_componentTypes_type",
        "deviceComponent_componentType_dataType" varchar(50),
        "deviceComponent_componentType_icon" varchar(50),
        "deviceComponent_componentType_min" numeric,
        "deviceComponent_componentType_max" numeric
    )
    AS $$
    DECLARE account_id_uuid uuid;
    BEGIN
        account_id_uuid := account_id::uuid;

        --get all componentTypes for deviceComponents
        CREATE TEMP TABLE component_types_temp ON COMMIT DROP AS
            SELECT (device_components_rows)."componentType" FROM (SELECT unnest(components) AS device_components_rows) q1;

        CREATE TEMP TABLE component_ids_temp ON COMMIT DROP AS
            SELECT "types".id, "types"."componentTypeId" from "dashboard"."componentTypes" AS "types"
                WHERE ("types"."accountId" = account_id_uuid AND "types"."componentTypeId" IN  (SELECT * FROM component_types_temp))
                    OR ("types"."accountId" IS NULL AND "types"."componentTypeId" IN  (SELECT * FROM component_types_temp));

        BEGIN
            INSERT INTO "dashboard"."device_components" (
                            "componentId",
                            "name",
                            "componentTypeId",
                            "deviceId",
                            "created",
                            "updated")
                SELECT (device_components_rows)."componentId",
                       (device_components_rows)."name",
                       (
                        SELECT "types".id FROM component_ids_temp AS "types"
                            WHERE ("types"."componentTypeId" = (device_components_rows)."componentType")
                       ),
                       (device_components_rows)."deviceId",
                        now(), now()
                    FROM (SELECT unnest(components) AS device_components_rows) q;
        EXCEPTION
            WHEN not_null_violation THEN
                RAISE EXCEPTION 'ComponentTypeNotFound';
            WHEN foreign_key_violation THEN
                RAISE EXCEPTION 'DeviceNotFound';
        END;

        RETURN QUERY
        SELECT
            "devices"."id",
            "devices"."name",
            "devices"."description",
            "devices"."gatewayId",
            "devices"."loc",
            "devices"."status",
            "attributes"."id" AS "attributes.id",
            "attributes"."key" AS "attributes.key",
            "attributes"."value" AS "attributes.value",
            "tags"."id" AS "tags.id",
            "tags"."value" AS "tags.value",
            "deviceComponents"."componentId" AS "deviceComponents.componentId",
            "deviceComponents"."name" AS "deviceComponents.name",
            "deviceComponents"."componentTypeId" AS "deviceComponents.componentTypeId",
            "deviceComponents.componentType"."componentTypeId" AS "deviceComponents.componentType.componentTypeId",
            "deviceComponents.componentType"."accountId" AS "deviceComponents.componentType.accountId",
            "deviceComponents.componentType"."dimension" AS "deviceComponents.componentType.dimension",
            "deviceComponents.componentType"."default" AS "deviceComponents.componentType.default",
            "deviceComponents.componentType"."display" AS "deviceComponents.componentType.display",
            "deviceComponents.componentType"."format" AS "deviceComponents.componentType.format",
            "deviceComponents.componentType"."measureunit" AS "deviceComponents.componentType.measureunit",
            "deviceComponents.componentType"."version" AS "deviceComponents.componentType.version",
            "deviceComponents.componentType"."type" AS "deviceComponents.componentType.type",
            "deviceComponents.componentType"."dataType" AS "deviceComponents.componentType.dataType",
            "deviceComponents.componentType"."icon" AS "deviceComponents.componentType.icon",
            "deviceComponents.componentType"."min" AS "deviceComponents.componentType.min",
            "deviceComponents.componentType"."max" AS "deviceComponents.componentType.max"

        FROM "dashboard"."devices" AS "devices"
            LEFT OUTER JOIN "dashboard"."device_attributes" AS "attributes" ON "devices"."id" = "attributes"."deviceId"
            LEFT OUTER JOIN "dashboard"."device_tags" AS "tags" ON "devices"."id" = "tags"."deviceId"
            LEFT OUTER JOIN "dashboard"."device_components" AS "deviceComponents" ON "devices"."id" = "deviceComponents"."deviceId"
            LEFT OUTER JOIN "dashboard"."componentTypes" AS "deviceComponents.componentType" ON "deviceComponents"."componentTypeId" = "deviceComponents.componentType"."id"
            WHERE "devices"."id" = dev_id AND "devices"."accountId" = account_id_uuid;

    END;
    $$ LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = postgres, pg_temp;
