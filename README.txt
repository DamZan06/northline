1. Aprire la mail Garmin e aprire il link
2. Fn + F12												// Fn tasto in basso a sinistra, F12 tasto in alto sopra la lettera "P"
3. Network, Fetch/XHR
4. Aprire file "common?token..."
5. Headers
6. Coppiare tutto il testo a partire da in alto a sinistra con "Request URL" fino in fondo a sinistra con "... Safari/537.36" con CTRL + C 	// CRTL tasto in basso a sinistra
7. Andare nel Explorer, Desktop, garmin-test, start.txt
8. CTRL + A, CTRL + V, CTRL + S 														// CTRL tasto in basso a sinistra
9. Tasto Window e cercare PowerShell														// Tasto Windows in basso a sinistra
10. cd C:\Users\damia\Desktop\garmin-test
11. scp -r "C:\Users\damia\Desktop\garmin-test\start.txt" zero@192.168.1.86:/home/zero/NorthLine
12. Se chiede la password scrivere "zero"													// non si vede quello che si scrive
13. Cercare su Chrome "Raspberrypi connect"
14. Aprire il primo link e fare il log in
15. Connect Via, Remote shell
16. cd NorthLine
17. ./start.sh
18. Se non esce Permission denied andare a punto 20.
19. chmod +x start.sh e tornare a punto 17.	
20. Se funziona e ti dice che ha trovato dei punti allora aposto, altrimenti bestemiare
21. CTRL + C
22. nohup ./start.sh > log.txt 2>&1 &
23. tail -f log.txt 																// Controllare che anche qua escano i punti
24. exit
25. Cercare su Chrome "Firebase"
26. Go to Console																// Tasto in alto a destra
27. Aprire il progetto NorthLine
28. Sul lato sinistro aprire il Realtime Database
29. Nel centro dello schermo guardare se ci sono dei punti
30. Aprire il sito NorthLine e controllare che funziona										
