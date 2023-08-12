#!/bin/sh

sigint_handler()
{
  kill $PID
  exit
}

trap sigint_handler SIGINT

COMMAND=$1
shift 1

while true; do
  $COMMAND &
  PID=$!
  inotifywait -e modify -e move -e create -e delete -e attrib -r $@
  kill $PID
done

