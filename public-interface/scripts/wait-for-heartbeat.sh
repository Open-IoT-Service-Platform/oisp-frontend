#!/usr/bin/env bash
#   Use this script to test if a given TCP host/port are available

cmdname=$(basename $0)

echoerr() { if [[ $QUIET -ne 1 ]]; then echo "$@" 1>&2; fi }

usage()
{
    cat << USAGE >&2
Usage:
    $cmdname  osip services [-- command args]
    osip services : list of services to wait for their heartbeats
    -- COMMAND ARGS             Execute command with args after the test finishes
USAGE
    exit 1
}


# process arguments
while [[ $# -gt 0 ]]
do
    case "$1" in

        [0-9A-Z_a-z]* )
        OISP_SERVICES="${OISP_SERVICES} $1"
        shift 1
        ;;
        
        --)
        shift
        CLI="$@"
        break
        ;;

        --help)
        usage
        ;;

        *)
        echoerr "Unknown argument: $1"
        usage
        ;;

    esac
done

node ./scripts/wait-for-heartbeat.js ${OISP_SERVICES}

if [[ $CLI != "" ]]; then
    if [[ $RESULT -ne 0 && $STRICT -eq 1 ]]; then
        echoerr "$cmdname: strict mode, refusing to execute subprocess"
        exit $RESULT
    fi
    exec $CLI
else
    exit 0
fi
