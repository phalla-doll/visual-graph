/**
 * A rich, self-contained EDMX 4.0 sample modeling the Marvel Cinematic
 * Universe — sagas, phases, studios, movies, characters, actors, directors,
 * teams, and the Infinity Stones — wired together with navigation properties
 * so the graph shows off relationships of every cardinality.
 *
 * Used by the "Try example data" link in the XML editor.
 */
export const EXAMPLE_EDMX = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
  <edmx:DataServices>
    <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="Marvel.Cinematic">

      <EntityType Name="Saga">
        <Key>
          <PropertyRef Name="SagaId" />
        </Key>
        <Property Name="SagaId" Type="Edm.Guid" Nullable="false" />
        <Property Name="Title" Type="Edm.String" Nullable="false" />
        <Property Name="Tagline" Type="Edm.String" />
        <Property Name="StartYear" Type="Edm.Int32" Nullable="false" />
        <Property Name="EndYear" Type="Edm.Int32" />
        <Property Name="IsComplete" Type="Edm.Boolean" Nullable="false" />
        <NavigationProperty Name="Phases" Type="Collection(Marvel.Cinematic.Phase)" />
      </EntityType>

      <EntityType Name="Phase">
        <Key>
          <PropertyRef Name="PhaseId" />
        </Key>
        <Property Name="PhaseId" Type="Edm.Int32" Nullable="false" />
        <Property Name="Name" Type="Edm.String" Nullable="false" />
        <Property Name="Number" Type="Edm.Byte" Nullable="false" />
        <Property Name="OpeningFilm" Type="Edm.String" />
        <Property Name="ReleaseSpan" Type="Edm.String" />
        <NavigationProperty Name="Saga" Type="Marvel.Cinematic.Saga" Nullable="false" />
        <NavigationProperty Name="Movies" Type="Collection(Marvel.Cinematic.Movie)" />
      </EntityType>

      <EntityType Name="Studio">
        <Key>
          <PropertyRef Name="StudioId" />
        </Key>
        <Property Name="StudioId" Type="Edm.Guid" Nullable="false" />
        <Property Name="Name" Type="Edm.String" Nullable="false" />
        <Property Name="Founded" Type="Edm.Int32" Nullable="false" />
        <Property Name="Headquarters" Type="Edm.String" />
        <Property Name="ParentCompany" Type="Edm.String" />
        <NavigationProperty Name="Movies" Type="Collection(Marvel.Cinematic.Movie)" />
      </EntityType>

      <EntityType Name="Movie">
        <Key>
          <PropertyRef Name="MovieId" />
        </Key>
        <Property Name="MovieId" Type="Edm.Guid" Nullable="false" />
        <Property Name="Title" Type="Edm.String" Nullable="false" />
        <Property Name="ReleaseDate" Type="Edm.Date" Nullable="false" />
        <Property Name="RuntimeMinutes" Type="Edm.Int16" Nullable="false" />
        <Property Name="BudgetUsd" Type="Edm.Decimal" Nullable="false" />
        <Property Name="BoxOfficeUsd" Type="Edm.Decimal" />
        <Property Name="RottenTomatoesScore" Type="Edm.Byte" />
        <Property Name="Synopsis" Type="Edm.String" />
        <Property Name="PhaseNumber" Type="Edm.Byte" Nullable="false" />
        <NavigationProperty Name="Studio" Type="Marvel.Cinematic.Studio" Nullable="false" />
        <NavigationProperty Name="Phase" Type="Marvel.Cinematic.Phase" Nullable="false" />
        <NavigationProperty Name="Director" Type="Marvel.Cinematic.Director" Nullable="false" />
        <NavigationProperty Name="Cast" Type="Collection(Marvel.Cinematic.CastMember)" />
        <NavigationProperty Name="InfinityStones" Type="Collection(Marvel.Cinematic.InfinityStone)" />
      </EntityType>

      <EntityType Name="Character">
        <Key>
          <PropertyRef Name="CharacterId" />
        </Key>
        <Property Name="CharacterId" Type="Edm.Guid" Nullable="false" />
        <Property Name="Alias" Type="Edm.String" Nullable="false" />
        <Property Name="RealName" Type="Edm.String" />
        <Property Name="Species" Type="Edm.String" />
        <Property Name="Allegiance" Type="Edm.String" Nullable="false" />
        <Property Name="HomePlanet" Type="Edm.String" />
        <Property Name="FirstAppearance" Type="Edm.String" />
        <Property Name="IsAvenger" Type="Edm.Boolean" Nullable="false" />
        <Property Name="PowerLevel" Type="Edm.Int32" />
        <NavigationProperty Name="PortrayedBy" Type="Marvel.Cinematic.Actor" />
        <NavigationProperty Name="Team" Type="Marvel.Cinematic.Team" />
        <NavigationProperty Name="Nemesis" Type="Marvel.Cinematic.Character" />
        <NavigationProperty Name="Appearances" Type="Collection(Marvel.Cinematic.CastMember)" />
      </EntityType>

      <EntityType Name="CastMember">
        <Key>
          <PropertyRef Name="CastMemberId" />
        </Key>
        <Property Name="CastMemberId" Type="Edm.Guid" Nullable="false" />
        <Property Name="BillingOrder" Type="Edm.Int16" Nullable="false" />
        <Property Name="IsLeadRole" Type="Edm.Boolean" Nullable="false" />
        <Property Name="ScreenTimeMinutes" Type="Edm.Int16" />
        <NavigationProperty Name="Movie" Type="Marvel.Cinematic.Movie" Nullable="false" />
        <NavigationProperty Name="Character" Type="Marvel.Cinematic.Character" Nullable="false" />
        <NavigationProperty Name="Actor" Type="Marvel.Cinematic.Actor" Nullable="false" />
      </EntityType>

      <EntityType Name="Actor">
        <Key>
          <PropertyRef Name="ActorId" />
        </Key>
        <Property Name="ActorId" Type="Edm.Guid" Nullable="false" />
        <Property Name="FullName" Type="Edm.String" Nullable="false" />
        <Property Name="BirthDate" Type="Edm.Date" />
        <Property Name="Nationality" Type="Edm.String" />
        <Property Name="DebutMovie" Type="Edm.String" />
        <NavigationProperty Name="Roles" Type="Collection(Marvel.Cinematic.CastMember)" />
      </EntityType>

      <EntityType Name="Director">
        <Key>
          <PropertyRef Name="DirectorId" />
        </Key>
        <Property Name="DirectorId" Type="Edm.Guid" Nullable="false" />
        <Property Name="FullName" Type="Edm.String" Nullable="false" />
        <Property Name="Nationality" Type="Edm.String" />
        <Property Name="FilmsDirected" Type="Edm.Int16" />
        <NavigationProperty Name="Movies" Type="Collection(Marvel.Cinematic.Movie)" />
      </EntityType>

      <EntityType Name="Team">
        <Key>
          <PropertyRef Name="TeamId" />
        </Key>
        <Property Name="TeamId" Type="Edm.Guid" Nullable="false" />
        <Property Name="Name" Type="Edm.String" Nullable="false" />
        <Property Name="Base" Type="Edm.String" />
        <Property Name="FoundedInMovie" Type="Edm.String" />
        <Property Name="Motto" Type="Edm.String" />
        <NavigationProperty Name="Members" Type="Collection(Marvel.Cinematic.Character)" />
        <NavigationProperty Name="Leader" Type="Marvel.Cinematic.Character" />
      </EntityType>

      <EntityType Name="InfinityStone">
        <Key>
          <PropertyRef Name="StoneId" />
        </Key>
        <Property Name="StoneId" Type="Edm.Guid" Nullable="false" />
        <Property Name="Name" Type="Edm.String" Nullable="false" />
        <Property Name="Color" Type="Edm.String" Nullable="false" />
        <Property Name="Power" Type="Edm.String" />
        <Property Name="DebutFilm" Type="Edm.String" />
        <NavigationProperty Name="CurrentWielder" Type="Marvel.Cinematic.Character" />
        <NavigationProperty Name="Appearances" Type="Collection(Marvel.Cinematic.Movie)" />
      </EntityType>

      <EntityContainer Name="MarvelService">
        <EntitySet Name="Sagas" EntityType="Marvel.Cinematic.Saga" />
        <EntitySet Name="Phases" EntityType="Marvel.Cinematic.Phase" />
        <EntitySet Name="Studios" EntityType="Marvel.Cinematic.Studio" />
        <EntitySet Name="Movies" EntityType="Marvel.Cinematic.Movie" />
        <EntitySet Name="Characters" EntityType="Marvel.Cinematic.Character" />
        <EntitySet Name="CastMembers" EntityType="Marvel.Cinematic.CastMember" />
        <EntitySet Name="Actors" EntityType="Marvel.Cinematic.Actor" />
        <EntitySet Name="Directors" EntityType="Marvel.Cinematic.Director" />
        <EntitySet Name="Teams" EntityType="Marvel.Cinematic.Team" />
        <EntitySet Name="InfinityStones" EntityType="Marvel.Cinematic.InfinityStone" />
      </EntityContainer>

    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`
