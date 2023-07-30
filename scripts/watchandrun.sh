#!/bin/sh

sigint_handler()
{
  kill $PID
  exit
}

trap sigint_handler SIGINT

while true; do
  $@ &
  PID=$!
  inotifywait -e modify -e move -e create -e delete -e attrib -r `pwd` --exclude node_modules --exclude temp
  kill $PID
done

