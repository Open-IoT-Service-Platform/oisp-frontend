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

CREATE OR REPLACE FUNCTION dashboard.create_account(account_id varchar(255), name varchar(255),
                                        health_time_period integer, exec_interval integer,
                                        base_line_exec_interval integer, cd_model_frequency integer,
                                        cd_execution_frequency integer, data_retention integer,
                                        activation_code varchar(8), activation_code_expire_date bigint,
                                        settings json, attributes json,
                                        user_id varchar(255), user_acc_role varchar(255),
                                        created_date bigint)

    RETURNS TABLE (id uuid,
                    email varchar(255),
                    password varchar(255),
                    salt varchar(255),
                    "termsAndConditions" boolean,
                    verified boolean,
                    provider varchar(255),
                    attrs json,
                    created timestamp with time zone,
                    updated timestamp with time zone,
                    role "dashboard"."enum_user_accounts_role",
                    "accountId" uuid)
    AS $$
    BEGIN
        --Add account
        EXECUTE 'INSERT INTO "dashboard"."accounts" ("id",
                                                    "name",
                                                    "healthTimePeriod",
                                                    "exec_interval",
                                                    "base_line_exec_interval",
                                                    "cd_model_frequency",
                                                    "cd_execution_frequency",
                                                    "data_retention",
                                                    "activation_code",
                                                    "activation_code_expire_date",
                                                    "settings",
                                                    "attrs",
                                                    "created",
                                                    "updated")
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) '
        USING
            account_id::uuid,
            name,
            health_time_period,
            exec_interval,
            base_line_exec_interval,
            cd_model_frequency,
            cd_execution_frequency,
            data_retention,
            activation_code,
            to_timestamp(activation_code_expire_date / 1000),
            settings,
            attributes,
            to_timestamp(created_date / 1000),
            to_timestamp(created_date / 1000);

        --Add account for user
        EXECUTE 'INSERT INTO "dashboard"."user_accounts" ("userId",
                                                        "accountId",
                                                        "role",
                                                        "created",
                                                        "updated")
                VALUES ($1,$2,$3,$4,$5) '
        USING
            user_id::uuid,
            account_id::uuid,
            user_acc_role::"dashboard"."enum_user_accounts_role",
            to_timestamp(created_date / 1000),
            to_timestamp(created_date / 1000);

        --Return user with his accounts
        RETURN QUERY EXECUTE 'SELECT u.id, u.email, u.password, u.salt,
                                     u."termsAndConditions", u.verified,
                                     u.provider, u.attrs, u.created, u.updated,
                                     ua.role, ua."accountId"
                              FROM "dashboard"."users" u join "dashboard"."user_accounts" ua on u.id = ua."userId"
                              WHERE u.id = ' || quote_literal(user_id::uuid);
    END;
    $$ LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = postgres, pg_temp;

