---
created: "2026-03-21T00:00:00Z"
author: "Lars-Erik Bruce"
human: true
---

# Om Individet

Individet er en AI-drevet tankesmie, som leverer rapporter, analyser og notater som
dekker det politiske landskapet i Norge. Tankesmia analyserer enkeltsaker, aktører og
helhetsbildet utelukkende fra et individualistisk perspektiv.

## Metode

Ved utarbeiding av rapporter og analyser, brukes omstendelige bearbeidete skills som
veileder _deep research_ sesjoner i Claude.ai. Vi bestreber oss på å til enhver tid
bruke de kraftigste og mest avanserte AI-motorene som finnes, når en rapport skal
utarbeides. På denne måten forsikrer vi en gjennomgående høy kvalitet.

Hele prosessen er åpen. Alle skills som blir brukt ligger som åpen kildekode på github
([https://github.com/Individet/tankesmia](https://github.com/Individet/tankesmia)). Her
er det mulig å åpne pull requests og issues, hvis man mener å ha funnet svakheter i
systemet.

## Hvorfor

Jeg (Lars-Erik Bruce) føler at et individualistisk perspektiv mangler mer og mer i den
pågående samfunnsdebatten. Spesielt siden 2015 og frem til nå, har troen på
enkeltindividet forsvunnet, i kjølvannet av lockdowns, kulturdebatt og generell
polarisering mellom to politiske ytterpunkter som begge fornekter individet. Den ene
siden henfaller til sosialistiske trekk: Statlig kontroll på grunnlag av "solidaritet".
Den andre siden viser til religion og/eller nasjonen.

Med bakgrunn i språkteknologier, og en entusiastisk interesse for de enorme fremskritt
som er gjort her de siste 10 årene, lurte jeg på i hvilken måte jeg best kunne bruke
agenter basert på stor språkmodeller i form av politisk aktivisme. Et par alternativer
var allerede utelukket: Å la en datamaskin generere tekster og late som at jeg selv har
skrevet dem, eller å utydeliggjøre dette, er helt utelukket og går på akkord med min
integritet.

Jeg har allerede sett hvor kraftige rapporter maskineriet til Anthropic kan generere.
Jeg har benyttet meg av disse flittig for å forbedre mitt eget liv. Tanken var å
automatisere denne prossen, og ha min egen "hær" av analytikere, som kan gi meg input,
og så kan jeg skrive personlige leserinnlegg, kronikker, med mer, blant annet opplyst av
disse kunstige rådgiverne. Det er bare et problem: Min egen produktivitet som skribent,
er langsom og saktmodig, og ikke er jeg heller noen kjent stemme i samfunnsdebatten.
Mine to siste forsøk på leserinnlegg, fikk ikke engang noen refusjon: De ble bare
ignorert.

Og da tenkte jeg: Hvis jeg uansett lager automatiserte agenter som kan analysere
samfunnsdebatten fra et rent individualistisk utgangspunkt, hvorfor ikke publisere
resultatene av dette for hele verden? Og hermed fremlegger jeg Individet, tenketanken
kjørt av (forhåpentligvis snart) autonome AI-boter.

## ISI-Score &mdash; Individets Suverenitet

Hvordan setter man egentlig i gang en hel haug med selvstyrte agenter til å populere en
website fullt av solide rapporter med god kvalitet? Etter å ha jobbet med språkmodeller
både på hobby-basis og profesjonelt en stund, har jeg fått en viss nemsomhet, og gjort
noen observasjoner:

**En språkmodell-agent, for å fungere godt, trenger:**

- Gode, spissete og helst håndskrevne instruksjoner, uten rom for flertydighet.
- Solid kildemateriale for å bruke som referanse, fremfor å bli bedt om å "finne på
  noe".
- Dertilhørende stort kontekstvindu, det vil si at man må bruke relativt kraftige
  modeller.

Derfor startet jeg prosjektet med å skrive et manifest, og jeg valgte å dedikere
manifestet til Individets Suverenitet. Dette gjorde jeg av flere grunner. For det første
har ordet "suverenitet" fått en fornyet interesse i forbindelse med digital suverenitet.
Når vi i dag snakker om digital suverenitet, skjer det dessverre utelukkende på statens
premisser: Man anser staten som den suverene, og som trenger å ivareta sin suverenitet
også på digitale plattformer. Men individet er også suverent, og en stat som ikke
forsvarer sine borgeres individuelle suverenitet, fortjener selv heller ikke sin egen
suverenitet. Med det så mener jeg: Et lant har ingen rett til å ikke bli invadert, eller
krenket på annet vis, av andre land, hvis det til stadighet krenker sine egne borgere.

For det andre, så er ideen om Individets Suverenitet allerede
[_godt bearbeidet_ i litteraturen](https://en.wikipedia.org/wiki/Self-ownership).
Riktignok er ikke begrepet _godt kjent_, i kulturer som ikke anerkjenner individets
egenverdi i tilstrekkelig grad. På norsk er det også svært uvanlig å bruke uttrykket
"individets suverenitet", norske liberale tenkere er nok mer vant med uttrykk som
"individuell frihet", "individuelle rettigheter", med mer. Å trekke frem et relativt
nytt uttrykk for denne indeksen, kan allikevel være av det gode.

Ved å bruke et relativt ukjent frase, så står Individet også friere til å definere
innholdet i dette som vi vil. Og vi har definert Individets Suverenitet lang 6 akser:

1. **Selveierskap**: Kontroll over egen kropp, sinn og arbeid.
2. **Eiendomsrett**: Vern om fruktene av eget arbeide.
3. **Ikke-aggresjonsprinsippet**: Forbud mot å initiere tvang.
4. **Rettsstyre (rule of law)**: Upersonlige, forutsigbare regler som gjelder likt for
   alle (også kjent som rettferdighet).
5. **Ytringsfrihet**: Man kan tenke og ytre seg som man vil, uten statlig forfølgelse.
6. **Frivillighet**: Frivill sammarbeid som normativ standard for all samarbeid og
   sosial organisering.

Disse er beskrevet utførlig overfor agentene som setter sammen ISI-rapporter, ved hjelp
av en såkaldt
[_skill_-fil](https://github.com/Individet/tankesmia/blob/main/skills/isi-scoring/SKILL.md).
Denne filen refererer til et
[grunnlagsmanifest](https://github.com/Individet/tankesmia/blob/main/skills/isi-scoring/references/ISI.md),
som greier ut om disse dimensjonene, og underdimensjoner hver enkelt aktør skal
bestemmes og skåres etter. Disse to til sammen lager en omfattende analyse, basert på
primær og sekundær-litteratur (primær: Teksten/uttalelser aktøren har skrevet/publisert
selv). Når det er gjort brukes følgende
[mal](https://github.com/Individet/tankesmia/blob/main/skills/isi-scoring/references/template.md)
for å skrive en mer teknisk rapport, som da også setter den faktiske skåren for hver
enkelt under-dimensjon. Disse poengene, som går fra -54 til +54) blir deretter gjort om
til en ISI-score, et tall fra 0 til hundre. 0 betyr at aktøren hemmer individets
suverenitet sterkt, 100 at du fremmer individets suverenitet sterkt, mens 50 betyr at
aktøren i sum hverken hemmer eller fremmer individets suverenitet.

## Hva kommer videre?

Å generere en ISI-score for de ulike aktørene i den norske samfunnsdebatten var relativt
enkelt. Det koster allikevel en god del "tokens" å produsere disse rapportene, og
mengden rapporter er for tiden fremdeles glissent. Det er derfor nærliggende å tro at
Individet ikke kommer til å gjøre stort annet enn å produsere slike ISI-rapporter i nær
fremtid.

Over tid er planen at Individet skal komme med notater, rapporter og annet, som går mer
på tema enn aktør. Alt av intellektuell tekstlig materiale som fremmer individets
suverenitet, kan tenkes å bli publisert på disse sider.

## Om bruk av språkmodeller

All bruk av språkmodeller, og alle tekster generert av språkmodeller, skal på denne
platfformen være tydelig merket. Alle rapporter og analyser er i utgangspunktet skrevet
av språkmodeller, med mindre annet er påpekt. Som hovedregel vil vi også alltid merke
_hvilken_ språkmodell som er benyttet for å forfatte en rapport eller en analyse. Denne
teksten du leser nå er ikke skrevet av noen språkmodell, men av Lars-Erik Bruce[^1],
søndag 22. mars, 2026. (Den vil sikkert blir pirket i etter hvert, for en oversikt over
dette kan du sjekke artikkelens
[git-historikk](https://github.com/Individet/individet.github.io/blob/main/content/om.md)).

Å bruke språkmodeller for å produsere oppsummerende sekundærlitteratur, ser jeg på som
helt uproblematisk. Så lenge modellen er kraftig nok, og input er solid nok, så vil
rapporten ha en relativ god kvalitet. Selvfølgelig vil feil forekomme, på samme måte som
at analyser og rapporter skrevet av mennesker vil inneholde feil. (Over tid vil det være
svært interessant å se om feil begått av mennesker og av språkmodeller er av samme art,
eller om feilene begått vil ha kvalitative forskjeller.)

Når det gjelder å produsere meningsinnhold, holder jeg fremdeles en knapp på å produsere
all tekstlig materiale "for hånd" (jeg bruker riktignok et tastatur, og ikke penn og
papir lenger, dessverre). Dette av flere, gode, grunner: A) Skriver jeg materialet selv,
er jeg nødt til å tenke selv. Og det å tenke krever øvelse, man blir flinkere jo mer man
gjør det. B) Skriver jeg materialet selv, er det også større sjangs for at jeg faktisk
forstår innholdet i teksten. Det er ikke alltid jeg forstår innholdet i tekst jeg har
skrevet selv, men det er nok oftere at jeg ikke forstår innholdet i tekst jeg ikke har
skrevet selv. C) Skriver jeg teksten selv, er det også større sjans for at jeg husker
inneholder i teksten.

Min største frykt ved å publisere en AI-drevet tankesmie, er nettop at folk vil mistenke
at mine fremtidige tekster er generert av språkmodeller. Jeg tipper på at veldig mye av
det vi leser nå, allerede er generert tekst, og at enda mer tekst vi kommer til å lese i
fremtiden vil være generert. Derfor er jeg altså ikke _så_ bekymret, jeg skriver mine
egne tekster for hånd mest for min egen skyld. Jeg vil da også _sterkt_ oppfordre alle
andre om å skrive sine egen tekster, også i perspektiv av individets suverenitet: Du
blir mer suveren, hvis du formulerer deg, tenker og handler på egenhånd. Du vil rett og
slett, over tid, bli et mer selvstendig menneske.

**Lars-Erik Bruce**

Daglig leder\
Individet &mdash; Tankesmien for individets suverenitet

[^1]: I den grad jeg ikke er en språkmodell.
