import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

const slides = [
  {
    key: "1",
    image: require("../assets/images/onboarding1.png"),
  },
  {
    key: "2",
    image: require("../assets/images/onboarding2.png"),
  },
  {
    key: "3",
    image: require("../assets/images/onboarding3.png"),
  },
  {
    key: "4",
    image: require("../assets/images/onboarding4.png"),
  },
];

export default function Onboarding({ onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef();
  const [finished, setFinished] = useState(false);

  const slidesCount = slides.length;

  const handleNext = () => {
    if (currentIndex < slidesCount - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish();
    }
  };

  const onViewRef = React.useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  const viewConfigRef = React.useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const maxOffset = (slidesCount - 1) * screenWidth;

    // Only call onFinish once, and only if user scrolls past last slide by 40 px
    if (!finished && contentOffsetX > maxOffset + 40) {
      setFinished(true);
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View style={{ width: screenWidth, height: screenHeight }}>
            <Image source={item.image} style={styles.image} />
          </View>
        )}
        ref={flatListRef}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        bounces={Platform.OS === "ios"} // only iOS supports bounces
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index.toString()}
            style={[
              styles.dot,
              currentIndex === index ? styles.activeDot : null,
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        {currentIndex === slidesCount - 1 && (
          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  buttons: {
    position: "absolute",
    bottom: 70,
    right: 30,
    alignSelf: "center",
  },
  button: {
    backgroundColor: "#a61d1dff",
    borderRadius: 25,
  },
  buttonText: {
    color: "white",
    padding: 15,
    fontSize: screenWidth * 0.035,
    fontWeight: 700,
    textAlign: "center",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    justifyContent: "center",
    alignSelf: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#bbb",
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: "#333",
  },
});
