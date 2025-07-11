PGDMP      /        
        }            quiz_app_db    17.5    17.5 2    |           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false            }           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false            ~           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false                       1262    32600    quiz_app_db    DATABASE     �   CREATE DATABASE quiz_app_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_United States.1252';
    DROP DATABASE quiz_app_db;
                     postgres    false            n           1247    33014    QuestionType    TYPE     k   CREATE TYPE public."QuestionType" AS ENUM (
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'SHORT_ANSWER'
);
 !   DROP TYPE public."QuestionType";
       public               postgres    false            q           1247    33022    SessionStatus    TYPE     n   CREATE TYPE public."SessionStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);
 "   DROP TYPE public."SessionStatus";
       public               postgres    false            k           1247    33007    UserRole    TYPE     O   CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'HOST',
    'ADMIN'
);
    DROP TYPE public."UserRole";
       public               postgres    false            �            1259    32646    answers    TABLE     5  CREATE TABLE public.answers (
    id text NOT NULL,
    "userId" text NOT NULL,
    "questionId" text NOT NULL,
    "isCorrect" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "participantId" text NOT NULL,
    "selectedOptionId" text
);
    DROP TABLE public.answers;
       public         heap r       postgres    false            �            1259    33036 
   categories    TABLE     �   CREATE TABLE public.categories (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
    DROP TABLE public.categories;
       public         heap r       postgres    false            �            1259    32637    live_sessions    TABLE     �  CREATE TABLE public.live_sessions (
    id text NOT NULL,
    code text NOT NULL,
    "startTime" timestamp(3) without time zone,
    "endTime" timestamp(3) without time zone,
    "quizId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "hostId" text NOT NULL,
    status public."SessionStatus" DEFAULT 'PENDING'::public."SessionStatus" NOT NULL
);
 !   DROP TABLE public.live_sessions;
       public         heap r       postgres    false    881    881            �            1259    32628    options    TABLE     *  CREATE TABLE public.options (
    id text NOT NULL,
    text text NOT NULL,
    "isCorrect" boolean DEFAULT false NOT NULL,
    "questionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
    DROP TABLE public.options;
       public         heap r       postgres    false            �            1259    33044    participants    TABLE     (  CREATE TABLE public.participants (
    id text NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL,
    "sessionId" text NOT NULL
);
     DROP TABLE public.participants;
       public         heap r       postgres    false            �            1259    32618 	   questions    TABLE     a  CREATE TABLE public.questions (
    id text NOT NULL,
    text text NOT NULL,
    "timeLimit" integer,
    points integer DEFAULT 1 NOT NULL,
    "quizId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type public."QuestionType" NOT NULL
);
    DROP TABLE public.questions;
       public         heap r       postgres    false    878            �            1259    32654    quiz_history    TABLE     �   CREATE TABLE public.quiz_history (
    id text NOT NULL,
    "userId" text NOT NULL,
    score integer NOT NULL,
    rank integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "quizId" text NOT NULL
);
     DROP TABLE public.quiz_history;
       public         heap r       postgres    false            �            1259    32610    quizzies    TABLE     `  CREATE TABLE public.quizzies (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "categoryId" text NOT NULL,
    "creatorId" text NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL
);
    DROP TABLE public.quizzies;
       public         heap r       postgres    false            �            1259    32601    users    TABLE     E  CREATE TABLE public.users (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "passwordHash" text NOT NULL,
    username text NOT NULL,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL
);
    DROP TABLE public.users;
       public         heap r       postgres    false    875    875            v          0    32646    answers 
   TABLE DATA           |   COPY public.answers (id, "userId", "questionId", "isCorrect", "createdAt", "participantId", "selectedOptionId") FROM stdin;
    public               postgres    false    222   F       x          0    33036 
   categories 
   TABLE DATA           U   COPY public.categories (id, name, description, "createdAt", "updatedAt") FROM stdin;
    public               postgres    false    224   9F       u          0    32637    live_sessions 
   TABLE DATA              COPY public.live_sessions (id, code, "startTime", "endTime", "quizId", "createdAt", "updatedAt", "hostId", status) FROM stdin;
    public               postgres    false    221   �G       t          0    32628    options 
   TABLE DATA           `   COPY public.options (id, text, "isCorrect", "questionId", "createdAt", "updatedAt") FROM stdin;
    public               postgres    false    220   H       y          0    33044    participants 
   TABLE DATA           b   COPY public.participants (id, score, "createdAt", "updatedAt", "userId", "sessionId") FROM stdin;
    public               postgres    false    225   H       s          0    32618 	   questions 
   TABLE DATA           l   COPY public.questions (id, text, "timeLimit", points, "quizId", "createdAt", "updatedAt", type) FROM stdin;
    public               postgres    false    219   ;H       w          0    32654    quiz_history 
   TABLE DATA           X   COPY public.quiz_history (id, "userId", score, rank, "createdAt", "quizId") FROM stdin;
    public               postgres    false    223   XH       r          0    32610    quizzies 
   TABLE DATA           {   COPY public.quizzies (id, title, description, "createdAt", "updatedAt", "categoryId", "creatorId", "isPublic") FROM stdin;
    public               postgres    false    218   uH       q          0    32601    users 
   TABLE DATA           ]   COPY public.users (id, "createdAt", "updatedAt", "passwordHash", username, role) FROM stdin;
    public               postgres    false    217   �H       �           2606    32653    answers Answer_pkey 
   CONSTRAINT     S   ALTER TABLE ONLY public.answers
    ADD CONSTRAINT "Answer_pkey" PRIMARY KEY (id);
 ?   ALTER TABLE ONLY public.answers DROP CONSTRAINT "Answer_pkey";
       public                 postgres    false    222            �           2606    33043    categories Category_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);
 D   ALTER TABLE ONLY public.categories DROP CONSTRAINT "Category_pkey";
       public                 postgres    false    224            �           2606    32636    options Option_pkey 
   CONSTRAINT     S   ALTER TABLE ONLY public.options
    ADD CONSTRAINT "Option_pkey" PRIMARY KEY (id);
 ?   ALTER TABLE ONLY public.options DROP CONSTRAINT "Option_pkey";
       public                 postgres    false    220            �           2606    33052    participants Participant_pkey 
   CONSTRAINT     ]   ALTER TABLE ONLY public.participants
    ADD CONSTRAINT "Participant_pkey" PRIMARY KEY (id);
 I   ALTER TABLE ONLY public.participants DROP CONSTRAINT "Participant_pkey";
       public                 postgres    false    225            �           2606    32627    questions Question_pkey 
   CONSTRAINT     W   ALTER TABLE ONLY public.questions
    ADD CONSTRAINT "Question_pkey" PRIMARY KEY (id);
 C   ALTER TABLE ONLY public.questions DROP CONSTRAINT "Question_pkey";
       public                 postgres    false    219            �           2606    32661    quiz_history QuizHistory_pkey 
   CONSTRAINT     ]   ALTER TABLE ONLY public.quiz_history
    ADD CONSTRAINT "QuizHistory_pkey" PRIMARY KEY (id);
 I   ALTER TABLE ONLY public.quiz_history DROP CONSTRAINT "QuizHistory_pkey";
       public                 postgres    false    223            �           2606    32617    quizzies Quiz_pkey 
   CONSTRAINT     R   ALTER TABLE ONLY public.quizzies
    ADD CONSTRAINT "Quiz_pkey" PRIMARY KEY (id);
 >   ALTER TABLE ONLY public.quizzies DROP CONSTRAINT "Quiz_pkey";
       public                 postgres    false    218            �           2606    32645    live_sessions Session_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.live_sessions DROP CONSTRAINT "Session_pkey";
       public                 postgres    false    221            �           2606    32609    users User_pkey 
   CONSTRAINT     O   ALTER TABLE ONLY public.users
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);
 ;   ALTER TABLE ONLY public.users DROP CONSTRAINT "User_pkey";
       public                 postgres    false    217            �           1259    32670    Session_code_key    INDEX     S   CREATE UNIQUE INDEX "Session_code_key" ON public.live_sessions USING btree (code);
 &   DROP INDEX public."Session_code_key";
       public                 postgres    false    221            �           1259    33053    User_username_key    INDEX     P   CREATE UNIQUE INDEX "User_username_key" ON public.users USING btree (username);
 '   DROP INDEX public."User_username_key";
       public                 postgres    false    217            �           2606    33084 !   answers Answer_participantId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.answers
    ADD CONSTRAINT "Answer_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES public.participants(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 M   ALTER TABLE ONLY public.answers DROP CONSTRAINT "Answer_participantId_fkey";
       public               postgres    false    225    222    4817            �           2606    32692    answers Answer_questionId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.answers
    ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 J   ALTER TABLE ONLY public.answers DROP CONSTRAINT "Answer_questionId_fkey";
       public               postgres    false    219    4804    222            �           2606    33089 $   answers Answer_selectedOptionId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.answers
    ADD CONSTRAINT "Answer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES public.options(id) ON UPDATE CASCADE ON DELETE SET NULL;
 P   ALTER TABLE ONLY public.answers DROP CONSTRAINT "Answer_selectedOptionId_fkey";
       public               postgres    false    222    4806    220            �           2606    33079    answers Answer_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.answers
    ADD CONSTRAINT "Answer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 F   ALTER TABLE ONLY public.answers DROP CONSTRAINT "Answer_userId_fkey";
       public               postgres    false    4799    217    222            �           2606    32682    options Option_questionId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.options
    ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public.questions(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 J   ALTER TABLE ONLY public.options DROP CONSTRAINT "Option_questionId_fkey";
       public               postgres    false    4804    220    219            �           2606    33074 '   participants Participant_sessionId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.participants
    ADD CONSTRAINT "Participant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.live_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 S   ALTER TABLE ONLY public.participants DROP CONSTRAINT "Participant_sessionId_fkey";
       public               postgres    false    225    4809    221            �           2606    33069 $   participants Participant_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.participants
    ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 P   ALTER TABLE ONLY public.participants DROP CONSTRAINT "Participant_userId_fkey";
       public               postgres    false    217    225    4799            �           2606    32677    questions Question_quizId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.questions
    ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzies(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 J   ALTER TABLE ONLY public.questions DROP CONSTRAINT "Question_quizId_fkey";
       public               postgres    false    218    4802    219            �           2606    33094 $   quiz_history QuizHistory_quizId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.quiz_history
    ADD CONSTRAINT "QuizHistory_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzies(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 P   ALTER TABLE ONLY public.quiz_history DROP CONSTRAINT "QuizHistory_quizId_fkey";
       public               postgres    false    218    4802    223            �           2606    32707 $   quiz_history QuizHistory_userId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.quiz_history
    ADD CONSTRAINT "QuizHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 P   ALTER TABLE ONLY public.quiz_history DROP CONSTRAINT "QuizHistory_userId_fkey";
       public               postgres    false    223    4799    217            �           2606    33054    quizzies Quiz_categoryId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.quizzies
    ADD CONSTRAINT "Quiz_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 I   ALTER TABLE ONLY public.quizzies DROP CONSTRAINT "Quiz_categoryId_fkey";
       public               postgres    false    224    218    4815            �           2606    33059    quizzies Quiz_creatorId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.quizzies
    ADD CONSTRAINT "Quiz_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 H   ALTER TABLE ONLY public.quizzies DROP CONSTRAINT "Quiz_creatorId_fkey";
       public               postgres    false    217    218    4799            �           2606    33064 !   live_sessions Session_hostId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT "Session_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 M   ALTER TABLE ONLY public.live_sessions DROP CONSTRAINT "Session_hostId_fkey";
       public               postgres    false    221    4799    217            �           2606    32687 !   live_sessions Session_quizId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.live_sessions
    ADD CONSTRAINT "Session_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzies(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 M   ALTER TABLE ONLY public.live_sessions DROP CONSTRAINT "Session_quizId_fkey";
       public               postgres    false    4802    221    218            v      x������ � �      x   �  x��S;n1�wO���]�0r �L3$��Z̮���4.S�W',���*T����73�!mI;���G�L,�KQ^d�6�D���<q�t��y�� �/��t\��8���mO�iؾ�J��o�8�q�P�aA�ս�kz_DL�Y2�Z� �r��D/Qytݷ���c�v��L�Қ'��q����a���� �ೳ��P�'ZƗ��3r���h?�T��{nW���nu>�����o�b�{�5���4{ǁ@����@��٪��n^>��ƫ��R.�1[��4� ɶ�mh�����kz�!GB+!+��a��H���%y�m6�o��ί�����hIz��M���Jp�o��a�x~�<%�O�_<����X�nm[�د��1kz�����>o      u      x������ � �      t      x������ � �      y      x������ � �      s      x������ � �      w      x������ � �      r      x������ � �      q   H  x�u��r�@е��,��VO�A;�ɀl1����V��@�%��)��B��wu���wLXBA�� ,0
�J�*.��1�<�H H� $�(�T��?��уݞ�o���x֗��?�U�g�E�q��ͥ���~RF�N�;(wuϺ�+�75�5�"֤@HF �N -� #j,%�^�C�!U����45K��2��H{�_.q��y�������]�����}Չ�����_o����!%7W"�� ���$q��N�{��L��\��.��u9�㢕�ɡ��x<��W����at���D��ˮ:}������t^9�}�Yz��h\#"qc$O0`� �� �	
D��E��Q�=�o|�eY�(�D�>�h��	���\�~viv�iH��zRg*W9��Y7y�+�_��!\���� s�)9TSjRl�#���hH%������o6SM�&��O����|��K�x1m�9�h_��'�_��|�4�gtY}�D�Xb1�4�@��i��B��4$2$
*���o6V��̯��zng�ss�L㘭�b��M!#׳�y[�X��z?��u}���;���Z�����     