import { useStore } from '@nanostores/react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import * as pmtiles from 'pmtiles'
import { useEffect, useState } from 'react'
import {Layer, LngLatBoundsLike, Source} from 'react-map-gl/maplibre'
import { Map, type ViewStateChangeEvent } from 'react-map-gl/maplibre'
import {
  $clickedMapData,
  $mapLoaded,
  $searchParams,
  baseMapSearchparamsParse,
  baseMapSearchparamsStringify,
  type BaseMapSeachparamsObject,
  type BaseMapSearchparams,
} from './store'
import { roundPositionForURL } from './utils/roundNumber'

export type MapInitialViewState = BaseMapSeachparamsObject & {
  // https://maplibre.org/maplibre-gl-js/docs/API/classes/maplibregl.Map/#setmaxbounds
  maxBounds?: LngLatBoundsLike
  // https://maplibre.org/maplibre-gl-js/docs/API/classes/maplibregl.Map/#setminzoom
  minZoom?: number
  // https://maplibre.org/maplibre-gl-js/docs/API/classes/maplibregl.Map/#setmaxzoom
  maxZoom?: number
}

type Props = {
  initialViewState: MapInitialViewState
  interactiveLayerIds: string[]
  boxZoom?: boolean
  children: React.ReactNode
}

export const BaseMap = ({ initialViewState, interactiveLayerIds, boxZoom, children }: Props) => {
  useEffect(() => {
    const protocol = new pmtiles.Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)
    return () => {
      maplibregl.removeProtocol('pmtiles')
    }
  }, [])

  const params = useStore($searchParams) as BaseMapSearchparams

  const [cursorStyle, setCursorStyle] = useState('grab')

  const setParamsMap = ({ latitude, longitude, zoom }: BaseMapSeachparamsObject) => {
    const mapParamsRounded = roundPositionForURL({ latitude, longitude, zoom })
    const mapParamString = baseMapSearchparamsStringify(mapParamsRounded)
    const replaceHistory = true
    $searchParams.open({ ...params, map: mapParamString }, replaceHistory)
  }

  // Update ?map on zoom or pan of map
  const handleMoveEnd = (event: ViewStateChangeEvent) => {
    const { latitude, longitude, zoom } = event.viewState
    setParamsMap({ latitude, longitude, zoom })
  }

  // Set ?map to `initialViewState` if no `map` present, yet
  useEffect(() => {
    if (params.map) return
    setParamsMap(initialViewState)
  }, [])

  const rasterAttribution='Data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, <a href="http://viewfinderpanoramas.org/">SRTM</a>, <a href="https://portal.opentopography.org/datasetMetadata?otCollectionID=OT.032021.4326.2">NASADEM</a>, <a href="https://worldcover2021.esa.int">ESA WorldCover</a>; Maps © <a href="https://www.tracestrack.com/">Tracestrack</a>'
  const latLngZoom = baseMapSearchparamsParse(params.map)

  return (
      <Map
          initialViewState={{
            ...initialViewState,
            zoom: latLngZoom.zoom || initialViewState.zoom,
            latitude: latLngZoom.latitude || initialViewState.latitude,
            longitude: latLngZoom.longitude || initialViewState.longitude,
          }}
          // Style: https://cloud.maptiler.com/maps/dataviz/
          // mapStyle="https://api.maptiler.com/maps/dataviz/style.json?key=ur6Yh3ULc6QjatOYBgln"
          style={{ width: '100%', height: '100%' }}
          boxZoom={boxZoom || true}
          // hash
          // Set map state for <MapData>:
          onLoad={() => $mapLoaded.set(true)}
          // MapLocation
          onMoveEnd={handleMoveEnd}
          // Handle cursor and click:
          interactiveLayerIds={interactiveLayerIds}
          cursor={cursorStyle}
          onMouseEnter={() => setCursorStyle('pointer')}
          onMouseLeave={() => setCursorStyle('grab')}
          onClick={(event) => $clickedMapData.set(event.features)}
      >
        <Source
            type="raster"
            tiles={['https://maps.lw1.at/tiles/1.0.0/tracestack/webmercator_hq/{z}/{x}/{y}.png']}
            tileSize={512}
            attribution={rasterAttribution}
        >
          <Layer type="raster"></Layer>

        </Source>
        {children}
      </Map>
  )
}
