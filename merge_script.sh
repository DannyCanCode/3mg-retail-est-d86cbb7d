#!/bin/bash
git reset --hard HEAD
git checkout main
git pull origin main
git merge develop
git push origin main 