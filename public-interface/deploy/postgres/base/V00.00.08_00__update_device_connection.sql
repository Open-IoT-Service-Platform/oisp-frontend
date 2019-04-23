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

CREATE OR REPLACE FUNCTION dashboard.update_device_connection(
    device_id varchar(255),
    conn_server varchar(20),
    conn_status boolean,
    conn_type varchar(255)
)
    RETURNS "dashboard"."connectionBindings"
    AS $$

    DECLARE result "dashboard"."connectionBindings"%rowType;
    DECLARE last_connection timestamp with time zone;
    DECLARE conn_type_enum "dashboard"."enum_connectionBindings_type";

    BEGIN
        conn_type_enum := conn_type::"dashboard"."enum_connectionBindings_type";

        IF conn_status = TRUE
            THEN
                last_connection := now();
        END IF;

        UPDATE dashboard."connectionBindings"
            SET server = conn_server, "lastConnectedAt" = COALESCE(last_connection, "lastConnectedAt"), updated = now(), "connectingStatus" = conn_status
            WHERE "deviceId" = device_id AND "type" = conn_type_enum
            RETURNING * INTO result;

        IF result IS NULL
            THEN
                INSERT INTO dashboard."connectionBindings"
                    (id, "deviceId", "lastConnectedAt", "server", "connectingStatus", "type", "created", "updated")
                VALUES
                    ("dashboard".uuid_generate_v4(), device_id, now(), conn_server, conn_status, conn_type_enum, now(), now())
                RETURNING * INTO result;
        END IF;

        RETURN result;
    END;

$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = postgres, pg_temp;
