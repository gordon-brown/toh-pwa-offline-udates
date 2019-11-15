# Angular Heroes with PWA and offline transactions

This is our favorite hero application with PWA and offline transactions. It is a learning project so the code is provided as is. The base project is the standard Tour of Heroes learning project from Google. Also included is a SQL rest api. This is largely borrowed from <https://github.com/Microsoft/sql-server-samples/tree/master/samples/features/json/angularjs/dotnet-tour-of-heroes>

## PWA

You can find a number of posts on how to make your application into an application into a PWA. Here is one link
<https://medium.com/beginners-guide-to-mobile-web-development/introduction-to-pwa-in-asp-net-core-application-da96c7cc4918>

## Offline Updates

The offline transactions are more interesting. I couldn't find a lot of documentation on this which is why I beleive this might be useful to others.
The basic approach is to use IndexDb. When we are connected we update the database. When we are not connected we update a transaction file instead. When the application
goes back on-line these transactions are applied to the database. I have done this in a simple manner updating one transaction at a time.
A better approach may be to send a JSON array to the server and update that usinig a cursor with a transaction wrapped around it so that it is atomic. There are now three services that handle updates

HeroService - This does the Sychronization when we go online. It also delegates to the other two services depending on online/offline status.
IndexDbService - Updates the indexDb tables
DataService - Updates the database which could be in memory
