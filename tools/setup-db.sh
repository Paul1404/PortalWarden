# Run Prisma migrations to set up the database
echo "Running Prisma migrations to set up the database..." | tee -a $LOGFILE
cd ..  # Navigate to the directory containing your Prisma schema
prisma migrate deploy | tee -a $LOGFILE

echo "Database setup complete." | tee -a $LOGFILE

# Ask the user if they want to create a new user
read -p "Do you want to create a new user? (y/n) " answer
case $answer in
    [Yy]* ) 
        echo "Creating new user..." | tee -a $LOGFILE
        node ./tools/addUser.js | tee -a $LOGFILE
        ;;
    [Nn]* ) 
        echo "Skipping user creation." | tee -a $LOGFILE
        ;;
    * ) 
        echo "Please answer yes or no." | tee -a $LOGFILE
        ;;
esac

# Ask the user if they want to enable SPI
read -p "Do you want to enable SPI on the Raspberry Pi? (y/n) " spi_answer
case $spi_answer in
    [Yy]* ) 
        echo "Enabling SPI..." | tee -a $LOGFILE
        ./enable-spi.sh | tee -a $LOGFILE
        echo "SPI enabled." | tee -a $LOGFILE
        ;;
    [Nn]* ) 
        echo "Skipping SPI enable." | tee -a $LOGFILE
        ;;
    * ) 
        echo "Please answer yes (y) or no (n)." | tee -a $LOGFILE
        ;;
esac

echo "Finished! You can run the webserver with: npm run web" | tee -a $LOGFILE

exit