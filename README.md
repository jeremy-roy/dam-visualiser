# Dam Storage Visualization

This app visualizes dam storage levels in the Western Cape using deck.gl and Mapbox.

## Installation

1. Install dependencies:
   ```bash
   npm install
   npm install @deck.gl/mapbox
   ```
2. Copy `.env.example` to `.env` and set your Mapbox token.
3. Start the development server:
   ```bash
   npm start
   ```

## Environment Variables

Copy the `.env.example` file to `.env` in the project root and replace the placeholder with your Mapbox access token:

```
REACT_APP_MAPBOX_TOKEN=YOUR_MAPBOX_TOKEN_HERE
```

## Data

The app loads `public/Bulk_Water_Dams_Enriched.geojson` on startup. Replace this file with your geojson data containing dam polygons and time-series `storage_levels`.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)



# Planning
## Data
- Remove generation of current_percentage_full & current_date from properties
- Is the mapping in the data nessesary, the app also does mapping between the geojson and the damlevels

# Dam Visualiser App
- remove .env file on repo

# Notes
Big 6:
Berg River, Steenbras Lower, Steenbras Upper, Theewaterskloof, Voëlvlei and Wemmershoek

# Color gradients:
0% - 20% FF6961
21% - 40% FFB54C
41% - 60% F8D66D
61% - 80% 7ABD7E
81% - 100% 8CD47E


# Data Structure
/public
  /data        
    dam_polygons.geojson                    ← spatial layer only
    /timeseries
      dam_levels_daily.json                 ← full timeseries, per dam, daily
      dam_levels_monthly.json               ← resampled to monthly
      dam_levels_yearly.json                ← yearly averages
      cape_town_rainfall_daily.json         ← daily total rain + temp
      cape_town_rainfall_monthly.json       ← monthly aggregates
      cape_town_rainfall_yearly.json        ← yearly summaries
      cape_town_population_yearly.json      ← annual values




CODEX Prompt initialiser:

My repo conatains a react app for visualising Dam Level Data on a map
The app has a component called DamLevels.js for viewing dam Levels in a list
The app has a component called DamPopup.js for viewing timeseries data of dams.
The app has a toggle for difference base maps called BasemapToggle.js
The MapContainer,js component is the full screen map.

The dam data is in the following structure:

/public
  /data        
    dam_polygons.geojson                    ← spatial layer only
    /timeseries
      dam_levels_daily.json                 ← full timeseries, per dam, daily
      dam_levels_monthly.json               ← resampled to monthly
      dam_levels_yearly.json                ← yearly averages
      cape_town_rainfall_daily.json         ← daily total rain + temp
      cape_town_rainfall_monthly.json       ← monthly aggregates
      cape_town_rainfall_yearly.json        ← yearly summaries
      cape_town_population_yearly.json      ← annual values



