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

CREATE OR REPLACE FUNCTION dashboard.create_user(id varchar(255), email varchar(255), password varchar(255),
                                        salt varchar(255), terms boolean,
                                        verified boolean, provider varchar(255),attrs json, user_type varchar(255))
RETURNS "dashboard"."users"
AS $$
DECLARE result "dashboard"."users"%rowType;
DECLARE user_type_enum "dashboard"."enum_user_type";
BEGIN

    IF user_type IS NULL
        THEN
            user_type_enum = 'user'::"dashboard"."enum_user_type";
        ELSE
            user_type_enum = user_type::"dashboard"."enum_user_type";
    END IF;

    EXECUTE 'INSERT INTO "dashboard"."users" ("id",
                                            "email",
                                            "password",
                                            "salt",
                                            "termsAndConditions",
                                            "verified",
                                            "provider",
                                            "attrs",
                                            "created",
                                            "updated",
                                            "type")
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, $11)
             RETURNING *'
    USING
        id::uuid,
        email,
        password,
        salt,
        COALESCE(terms, false),
        COALESCE(verified, false),
        provider,
        attrs,
        now(),
        now(),
        user_type_enum
    INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = postgres, pg_temp;

