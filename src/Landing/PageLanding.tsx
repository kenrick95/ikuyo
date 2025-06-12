import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  GlobeIcon,
  HomeIcon,
  ListBulletIcon,
  MixIcon,
  Share2Icon,
} from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Section,
  Text,
} from '@radix-ui/themes';
import { useCallback, useId } from 'react';
import { Link } from 'wouter';
import { useCurrentUser } from '../Auth/hooks';
import imgUrl from '../logo/ikuyo.svg';
import { DocTitle } from '../Nav/DocTitle';
import { RouteLogin, RouteTrips } from '../Routes/routes';
import ScreenshotTripCommentAvif from './assets/ScreenshotTripComment_resized.avif';
import ScreenshotTripComment from './assets/ScreenshotTripComment_resized.png';
import ScreenshotTripCommentWebp from './assets/ScreenshotTripComment_resized.webp';
import ScreenshotTripExpenseAvif from './assets/ScreenshotTripExpense_resized.avif';
import ScreenshotTripExpense from './assets/ScreenshotTripExpense_resized.png';
import ScreenshotTripExpenseWebp from './assets/ScreenshotTripExpense_resized.webp';
import ScreenshotTripHomeAvif from './assets/ScreenshotTripHome_resized.avif';
import ScreenshotTripHome from './assets/ScreenshotTripHome_resized.png';
import ScreenshotTripHomeWebp from './assets/ScreenshotTripHome_resized.webp';
import ScreenshotTripListAvif from './assets/ScreenshotTripList_resized.avif';
import ScreenshotTripList from './assets/ScreenshotTripList_resized.png';
import ScreenshotTripListWebp from './assets/ScreenshotTripList_resized.webp';
import ScreenshotTripMapAvif from './assets/ScreenshotTripMap_resized.avif';
import ScreenshotTripMap from './assets/ScreenshotTripMap_resized.png';
import ScreenshotTripMapWebp from './assets/ScreenshotTripMap_resized.webp';
import ScreenshotTripTimetableAvif from './assets/ScreenshotTripTimetable_resized.avif';
import ScreenshotTripTimetable from './assets/ScreenshotTripTimetable_resized.png';
import ScreenshotTripTimetableWebp from './assets/ScreenshotTripTimetable_resized.webp';
import s from './PageLanding.module.css';

const EXAMPLE_TRIP_ID = '2617cd98-a229-45d4-9617-5265d52317cd';

export default PageLanding;

export function PageLanding() {
  const currentUser = useCurrentUser();
  const idFeatures = useId();

  const handleLearnMore = useCallback(() => {
    // Scroll to the features section
    const featuresSection = document.getElementById(idFeatures);
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, [idFeatures]);

  return (
    <Box>
      <DocTitle title="" />
      {/* Hero Section */}
      <Section size="3" className={s.heroSection}>
        <Container size="3">
          <Flex direction="column" align="center" gap="6" py="9">
            <Flex align="center" gap="3">
              <img src={imgUrl} className={s.logo} alt="Ikuyo Logo" />
              <Heading size="9" weight="bold" className={s.logoText}>
                Ikuyo<span className={s.logoTextExclamation}>!</span>
              </Heading>
            </Flex>

            <Heading size="7" align="center" className={s.heroHeading}>
              Plan your perfect trip with friends and family
            </Heading>

            <Text size="4" align="center" className={s.heroHeadingSubtitle}>
              The collaborative travel planning app that makes organizing group
              trips effortless
            </Text>

            <Flex gap="3" wrap="wrap" justify="center">
              {currentUser ? (
                // Already logged in
                <Button size="4" asChild>
                  <Link to={RouteTrips.asRootRoute()}>
                    View My Trips <ArrowRightIcon />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="4" asChild>
                    <Link to={RouteLogin.asRootRoute()}>
                      Get Started <ArrowRightIcon />
                    </Link>
                  </Button>
                  <Button size="4" variant="outline" onClick={handleLearnMore}>
                    Learn More
                  </Button>
                </>
              )}
            </Flex>
          </Flex>
        </Container>
      </Section>
      {/* Features Section */}
      <Section id={idFeatures} size="3">
        <Container size="3">
          <Flex direction="column" gap="8">
            <Box className={s.featuresHeading}>
              <Heading size="7" mb="3">
                Everything you need for trip planning
              </Heading>
              <Text size="4" color="gray">
                From initial planning to expense tracking, Ikuyo has you covered
              </Text>
            </Box>
            <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="6">
              <Card>
                <Flex direction="column" gap="3" p="4">
                  <Box className={s.iconBox}>
                    <CalendarIcon width="32" height="32" />
                  </Box>
                  <Heading size="4">Activity Planning</Heading>
                  <Text color="gray">
                    Schedule activities with precise times and locations.
                    Visualize your itinerary on an interactive timetable that
                    shows overlapping events so you can optimize your schedules.
                  </Text>
                </Flex>
              </Card>
              <Card>
                <Flex direction="column" gap="3" p="4">
                  <Box className={s.iconBox}>
                    <HomeIcon width="32" height="32" />
                  </Box>
                  <Heading size="4">Accommodation Management</Heading>
                  <Text color="gray">
                    Organize your accommodations with check-in/check-out times,
                    contact details, and location mapping for easy navigation.
                  </Text>
                </Flex>
              </Card>
              <Card>
                <Flex direction="column" gap="3" p="4">
                  <Box className={s.iconBox}>
                    <ListBulletIcon width="32" height="32" />
                  </Box>
                  <Heading size="4">Expense Tracking</Heading>
                  <Text color="gray">
                    Track expenses in multiple currencies. Keep tabs on your
                    trip spending so you can split costs among group members.
                  </Text>
                </Flex>
              </Card>
              <Card>
                <Flex direction="column" gap="3" p="4">
                  <Box className={s.iconBox}>
                    <GlobeIcon width="32" height="32" />
                  </Box>
                  <Heading size="4">Interactive Maps</Heading>
                  <Text color="gray">
                    View all your activities and accommodations on an
                    interactive map. Get a visual overview of your trip
                    geography and plan efficient routes.
                  </Text>
                </Flex>
              </Card>
              <Card>
                <Flex direction="column" gap="3" p="4">
                  <Box className={s.iconBox}>
                    <Share2Icon width="32" height="32" />
                  </Box>
                  <Heading size="4">Collaborative Planning</Heading>
                  <Text color="gray">
                    Invite friends and family to collaborate on trip planning.
                    Share itineraries and make group decisions together in
                    real-time.
                  </Text>
                </Flex>
              </Card>
              <Card>
                <Flex direction="column" gap="3" p="4">
                  <Box className={s.iconBox}>
                    <MixIcon width="32" height="32" />
                  </Box>
                  <Heading size="4">Multiple Views</Heading>
                  <Text color="gray">
                    Switch between timetable, list, and map views to see your
                    trip from different perspectives and find the planning style
                    that works best.
                  </Text>
                </Flex>
              </Card>
            </Grid>
          </Flex>
        </Container>
      </Section>
      {/* How It Works Section */}
      <Section size="3" className={s.howItWorksSection}>
        <Container size="3">
          <Flex direction="column" gap="8">
            <Box className={s.howItWorksHeading}>
              <Heading size="7" mb="3">
                How it works
              </Heading>
              <Text size="4" color="gray">
                Get started with your trip planning in just a few simple steps
              </Text>
            </Box>
            <Grid columns={{ initial: '1', md: '3' }} gap="6">
              <Flex
                direction="column"
                align="center"
                gap="4"
                className={s.stepContainer}
              >
                <Box className={s.stepBox}>1</Box>
                <Heading size="4">Create Your Trip</Heading>
                <Text color="gray">
                  Set your destination, dates, and time zone. Add basic trip
                  information to get started with your itinerary planning.
                </Text>
                <Screenshot
                  src={ScreenshotTripHome}
                  avifSrc={ScreenshotTripHomeAvif}
                  webpSrc={ScreenshotTripHomeWebp}
                  linkTo={`~/trip/${EXAMPLE_TRIP_ID}/home`}
                  alt="Trip Home Screenshot"
                />
                <Screenshot
                  src={ScreenshotTripMap}
                  avifSrc={ScreenshotTripMapAvif}
                  webpSrc={ScreenshotTripMapWebp}
                  linkTo={`~/trip/${EXAMPLE_TRIP_ID}/map`}
                  alt="Trip Map Screenshot"
                />
              </Flex>

              <Flex
                direction="column"
                align="center"
                gap="4"
                className={s.stepContainer}
              >
                <Box className={s.stepBox}>2</Box>
                <Heading size="4">Plan Activities</Heading>
                <Text color="gray">
                  Add activities, accommodations, and day plans. Use the
                  interactive timetable to visualize your schedule and avoid
                  conflicts.
                </Text>
                <Screenshot
                  src={ScreenshotTripTimetable}
                  avifSrc={ScreenshotTripTimetableAvif}
                  webpSrc={ScreenshotTripTimetableWebp}
                  linkTo={`~/trip/${EXAMPLE_TRIP_ID}/timetable`}
                  alt="Trip Timetable Screenshot"
                />
                <Screenshot
                  src={ScreenshotTripList}
                  avifSrc={ScreenshotTripListAvif}
                  webpSrc={ScreenshotTripListWebp}
                  linkTo={`~/trip/${EXAMPLE_TRIP_ID}/list`}
                  alt="Trip List Screenshot"
                />
              </Flex>

              <Flex
                direction="column"
                align="center"
                gap="4"
                className={s.stepContainer}
              >
                <Box className={s.stepBox}>3</Box>
                <Heading size="4">Collaborate & Track</Heading>
                <Text color="gray">
                  Invite travel companions to collaborate on planning. Track
                  expenses and manage all trip details in one place.
                </Text>
                <Screenshot
                  src={ScreenshotTripExpense}
                  avifSrc={ScreenshotTripExpenseAvif}
                  webpSrc={ScreenshotTripExpenseWebp}
                  linkTo={`~/trip/${EXAMPLE_TRIP_ID}/expense`}
                  alt="Trip Expense Screenshot"
                />
                <Screenshot
                  src={ScreenshotTripComment}
                  avifSrc={ScreenshotTripCommentAvif}
                  webpSrc={ScreenshotTripCommentWebp}
                  linkTo={`~/trip/${EXAMPLE_TRIP_ID}/comment`}
                  alt="Trip Comment Screenshot"
                />
              </Flex>
            </Grid>
            <Flex justify="center">
              <Button size="3" variant="outline" asChild>
                <Link to={`~/trip/${EXAMPLE_TRIP_ID}/home`}>
                  View Example Trip
                </Link>
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Section>
      {/* Benefits Section */}
      <Section size="3">
        <Container size="3">
          <Grid columns={{ initial: '1', md: '2' }} gap="8" align="center">
            <Flex direction="column" gap="6">
              <Heading size="7">Why choose Ikuyo?</Heading>
              <Flex direction="column" gap="4">
                <Flex align="center" gap="3">
                  <Box className={s.checkIcon}>
                    <CheckIcon width="20" height="20" />
                  </Box>
                  <Text size="4">
                    Real-time collaboration with travel companions
                  </Text>
                </Flex>

                <Flex align="center" gap="3">
                  <Box className={s.checkIcon}>
                    <CheckIcon width="20" height="20" />
                  </Box>
                  <Text size="4">
                    Visual timetable prevents scheduling conflicts
                  </Text>
                </Flex>

                <Flex align="center" gap="3">
                  <Box className={s.checkIcon}>
                    <CheckIcon width="20" height="20" />
                  </Box>
                  <Text size="4">Multi-currency expense tracking</Text>
                </Flex>

                <Flex align="center" gap="3">
                  <Box className={s.checkIcon}>
                    <CheckIcon width="20" height="20" />
                  </Box>
                  <Text size="4">Interactive maps for location planning</Text>
                </Flex>

                <Flex align="center" gap="3">
                  <Box className={s.checkIcon}>
                    <CheckIcon width="20" height="20" />
                  </Box>
                  <Text size="4">
                    Flexible viewing options (timetable, list, map)
                  </Text>
                </Flex>

                <Flex align="center" gap="3">
                  <Box className={s.checkIcon}>
                    <CheckIcon width="20" height="20" />
                  </Box>
                  <Text size="4">
                    Detailed accommodation and activity management
                  </Text>
                </Flex>

                <Flex align="center" gap="3">
                  <Box className={s.checkIcon}>
                    <CheckIcon width="20" height="20" />
                  </Box>
                  <Text size="4">
                    100%{' '}
                    <a
                      href="https://github.com/kenrick95/ikuyo"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      free and open source
                    </a>{' '}
                    - no hidden costs
                  </Text>
                </Flex>
              </Flex>
            </Flex>
            <Card size="4" className={s.benefitsCard}>
              <Flex direction="column" gap="4" p="6">
                <Box className={s.benefitsCardIcon}>
                  <ClockIcon width="48" height="48" />
                </Box>
                <Heading size="5">Save hours of planning time</Heading>
                <Text size="3" color="gray">
                  Our intuitive interface and smart scheduling features help you
                  organize complex itineraries quickly and efficiently.
                </Text>
                <Text size="3" className={s.benefitsCardQuote}>
                  "Ikuyo turned my chaotic trip planning into a smooth,
                  organized experience. Highly recommended!" &mdash; me
                </Text>
              </Flex>
            </Card>
          </Grid>
        </Container>
      </Section>
      {/* CTA Section */}
      <Section size="3" className={s.ctaSection}>
        <Container size="3">
          <Flex direction="column" align="center" gap="6" py="8">
            <Heading size="7" className={s.ctaTitle}>
              Ready to plan your next adventure?
            </Heading>
            <Text size="4" weight="bold" className={s.ctaSubtitle}>
              Join travelers who trust Ikuyo to make their trip planning
              effortless and fun. Completely free!
            </Text>

            {currentUser ? (
              <Button size="4" variant="surface" asChild>
                <Link to={RouteTrips.asRootRoute()}>
                  View My Trips <ArrowRightIcon />
                </Link>
              </Button>
            ) : (
              <Button size="4" variant="surface" asChild>
                <Link to={RouteLogin.asRootRoute()}>
                  Start Planning Today <ArrowRightIcon />
                </Link>
              </Button>
            )}
          </Flex>
        </Container>
      </Section>
      {/* Footer */}
      <Section size="2" className={s.footer}>
        <Container size="3">
          <Flex justify="between" align="center" wrap="wrap" gap="4">
            <Flex align="center" gap="2">
              <img src={imgUrl} className={s.footerLogo} alt="Ikuyo Logo" />
              <Text size="3" weight="medium">
                Ikuyo!
              </Text>
            </Flex>

            <Flex gap="4" wrap="wrap">
              <Text size="2" asChild>
                <Link to="/privacy" className={s.footerLink}>
                  Privacy Policy
                </Link>
              </Text>
              <Text size="2" asChild>
                <Link to="/terms" className={s.footerLink}>
                  Terms of Service
                </Link>
              </Text>
              <Text size="2" asChild>
                <a
                  href="https://github.com/kenrick95/ikuyo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.footerLink}
                >
                  Source Code (GitHub)
                </a>
              </Text>
            </Flex>
          </Flex>
        </Container>
      </Section>
    </Box>
  );
}

function Screenshot({
  src,
  webpSrc,
  avifSrc,
  alt,
  linkTo,
}: {
  src: string;
  webpSrc: string;
  avifSrc: string;
  alt: string;
  linkTo: string;
}) {
  return (
    <Link to={linkTo} className={s.screenshotLink}>
      <picture>
        <source srcSet={avifSrc} type="image/avif" />
        <source srcSet={webpSrc} type="image/webp" />
        <img src={src} className={s.screenshot} alt={alt} loading="lazy" />
      </picture>
    </Link>
  );
}
